import logging
import os
import httpx # Added for RAG service communication
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware # Added for CORS

from .services import process_chat_request, generate_title_for_conversation
from . import models, schemas, crud

app = FastAPI()

# Define RAG Service URL
RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:8002")

# Configure CORS to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # The origin of your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create database tables on startup
    models.create_db_and_tables()

# Dependency to get DB session
def get_db():
    db = models.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ChatRequest(BaseModel):
    message: str
    session_id: str # This will now be the conversation_id
    model_name: str

@app.post("/chat")
async def process_chat(request: ChatRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Save user message
    crud.add_message(db, request.session_id, "user", request.message)

    response = await process_chat_request(request.message, request.session_id, request.model_name, db)

    # Save bot message after the full response is generated, only if it's not an error message
    if not response["reply"].startswith("Error:"):
        crud.add_message(db, request.session_id, "bot", response["reply"])

    # Trigger title generation in the background after the first few messages
    messages_count = crud.get_message_count_by_conversation(db, request.session_id)
    if messages_count == 2: # After user's first message and bot's first reply
        background_tasks.add_task(generate_title_for_conversation, request.session_id, models.SessionLocal)

    return response

@app.post("/conversations", response_model=schemas.Conversation)
def create_new_conversation(conversation: schemas.ConversationCreate, db: Session = Depends(get_db)):
    return crud.create_conversation(db=db, title=conversation.title)

@app.get("/conversations", response_model=List[schemas.ConversationSummary])
def read_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    conversations = crud.get_conversations(db, skip=skip, limit=limit)
    return conversations

@app.get("/conversations/{conversation_id}/messages", response_model=List[schemas.Message])
def read_messages_by_conversation(conversation_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    messages = crud.get_messages_by_conversation(db, conversation_id=conversation_id, skip=skip, limit=limit)
    if not messages:
        # Return an empty list instead of 404 if no messages, as a new conversation might have no messages yet
        return []
    return messages

@app.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str, db: Session = Depends(get_db)): # Make the function async
    if not crud.delete_conversation(db, conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    # Add this block to call the RAG service
    try:
        async with httpx.AsyncClient() as client:
            rag_delete_url = f"{RAG_SERVICE_URL}/delete_by_conversation/{conversation_id}"
            response = await client.delete(rag_delete_url)
            response.raise_for_status() # Raise exception for 4xx/5xx errors
    except httpx.RequestError as e:
        # Log this error. The primary conversation is deleted, but cleanup failed.
        logging.warning(f"Failed to delete RAG documents for conversation {conversation_id}. Error: {e}")
    
    return # The original endpoint had no return, so we maintain that

@app.put("/messages/{message_id}", response_model=schemas.Message)
def update_message(message_id: str, message: schemas.MessageUpdate, db: Session = Depends(get_db)):
    # Call the new, corrected function
    db_message = crud.update_message_and_truncate_history(db, message_id, message.content)
    if not db_message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return db_message
