import logging
import os
import httpx # Added for RAG service communication
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware # Added for CORS

from .services import process_chat_request, AVAILABLE_MODELS
from .tasks import generate_title_for_conversation
from . import models, schemas, crud

from typing import Optional
from fastapi import APIRouter, Response
from . import ollama_client

ollama_router = APIRouter()

@ollama_router.get("/ollama/models")
async def get_ollama_models():
    return await ollama_client.list_local_models()

@ollama_router.post("/ollama/pull")
async def pull_ollama_model(model_name: schemas.ModelName):
    response = await ollama_client.pull_model(model_name.name)
    return Response(content=response.text, media_type=response.headers['content-type'])

@ollama_router.delete("/ollama/models/{model_name}")
async def delete_ollama_model(model_name: str):
    return await ollama_client.delete_model(model_name)



app = FastAPI()

app.include_router(ollama_router, prefix="/api")

# Define RAG Service URL
RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL")

# Configure CORS to allow frontend requests. Origins are loaded from environment variables.
# Multiple origins can be specified, separated by commas.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS, # The origin(s) of your Next.js app, loaded from env
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

@app.post("/chat")
async def process_chat(request: schemas.ChatRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Save user message
    crud.add_message(db, request.conversation_id, "user", request.message)

    model_name = None
    system_prompt = None
    temperature = None

    if request.persona_id:
        persona = crud.get_persona(db, request.persona_id)
        if persona:
            model_name = persona.model_name
            system_prompt = persona.system_prompt
            temperature = persona.temperature
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")

    response = await process_chat_request(
        request.message,
        request.conversation_id,
        model_name, # Pass persona's model_name or None
        system_prompt, # Pass persona's system_prompt or None
        temperature, # Pass persona's temperature or None
        db,
        request.use_rag
    )

    # Save bot message after the full response is generated, only if it's not an error message
    if not response["reply"].startswith("Error:"):
        crud.add_message(db, request.conversation_id, "bot", response["reply"])

    # Trigger title generation in the background after the first few messages.
    # For production, consider using a more robust task queue (e.g., Celery, Redis Queue) 
    # instead of FastAPI's BackgroundTasks for long-running or critical tasks.
    messages_count = crud.get_message_count_by_conversation(db, request.conversation_id)
    if messages_count == 2: # After user's first message and bot's first reply
        background_tasks.add_task(generate_title_for_conversation, request.conversation_id, models.SessionLocal)

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
    # First, delete the conversation from the main database.
    # The crud.delete_conversation function now raises HTTPException on not found.
    crud.delete_conversation(db, conversation_id)
    
    # Then, attempt to delete associated documents from the RAG service.
    try:
        async with httpx.AsyncClient() as client:
            rag_delete_url = f"{RAG_SERVICE_URL}/delete_by_conversation/{conversation_id}"
            response = await client.delete(rag_delete_url)
            response.raise_for_status() # Raise exception for 4xx/5xx errors
    except httpx.RequestError as e:
        # If the RAG service call fails, log the error and re-raise as an HTTPException.
        # This ensures the API consumer is aware of the partial failure.
        logging.error(f"Failed to delete RAG documents for conversation {conversation_id}. Error: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Failed to clean up RAG documents: {e}")
    except httpx.HTTPStatusError as e:
        # Handle HTTP errors from the RAG service (e.g., 404 if documents not found in RAG, 500 for server errors)
        logging.error(f"RAG service returned an error for conversation {conversation_id}: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"RAG service error: {e.response.text}")
    
    return # No content to return for 204 No Content status

@app.put("/messages/{message_id}", response_model=schemas.Message)
def update_message(message_id: str, message: schemas.MessageUpdate, db: Session = Depends(get_db)):
    # Call the new, corrected function
    db_message = crud.update_message_and_truncate_history(db, message_id, message.content)
    if not db_message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return db_message

@app.get("/models")
async def get_available_models():
    return {"models": AVAILABLE_MODELS}

@app.post("/personas", response_model=schemas.Persona)
def create_persona(persona: schemas.PersonaCreate, db: Session = Depends(get_db)):
    return crud.create_persona(db=db, persona=persona)

@app.get("/personas", response_model=List[schemas.Persona])
def read_personas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    personas = crud.get_personas(db, skip=skip, limit=limit)
    return personas

@app.put("/personas/{persona_id}", response_model=schemas.Persona)
def update_persona(persona_id: str, persona: schemas.PersonaCreate, db: Session = Depends(get_db)):
    db_persona = crud.update_persona(db, persona_id, persona)
    if not db_persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    return db_persona

@app.delete("/personas/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_persona(persona_id: str, db: Session = Depends(get_db)):
    success = crud.delete_persona(db, persona_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    return
