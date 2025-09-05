import logging
import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware 

from .core import ingest_document, search_documents, delete_collection_for_conversation

app = FastAPI()

# Configure CORS to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # The origin of your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DeleteResponse(BaseModel):
    status: str
    message: str

# NEW: Response model for the upload endpoint
class UploadResponse(BaseModel):
    status: str
    message: str
    filename: str
    conversation_id: str

@app.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    conversation_id: str = Form(...)
):
    # --- Start of New Validation Logic ---
    
    # 1. Basic Content-Type Check (First line of defense)
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDFs are allowed.")

    # 2. Securely stream to a temporary file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
    finally:
        file.file.close()
    
    # --- End of New Validation Logic ---

    # NEW: Add the time-consuming ingestion process to the background
    # The API will return a response immediately while this runs.
    # We pass the temp file path to the background task and create another function to clean it up.
    background_tasks.add_task(run_ingestion_and_cleanup, temp_file_path, file.filename, conversation_id)

    return {
        "status": "processing", 
        "message": "File accepted and is being processed in the background.",
        "filename": file.filename, 
        "conversation_id": conversation_id
    }

# NEW: Helper function to be run by BackgroundTasks
def run_ingestion_and_cleanup(file_path: str, filename: str, conversation_id: str):
    """
    Task to run ingestion and ensure the temporary file is deleted afterward.
    """
    try:
        # The new ingest_document function can raise a ValueError
        ingest_document(file_path, filename, conversation_id)
    except Exception as e:
        # Log any errors during background ingestion.
        # For a production system, you might want to add more robust error reporting here
        # (e.g., updating a status in a database).
        logging.error(f"Background ingestion failed for {filename} in conversation {conversation_id}: {e}")
    finally:
        # IMPORTANT: Always clean up the temporary file
        os.unlink(file_path)

class SearchRequest(BaseModel):
    query: str
    conversation_id: str
    top_k: int = 4

class DocumentChunk(BaseModel):
    page_content: str # Renamed from 'content' to match LangChain's Document object
    metadata: dict

@app.post("/retrieve", response_model=list[DocumentChunk])
async def retrieve_documents(request: SearchRequest):
    """Retrieves relevant document chunks from the vector store."""
    try:
        results = search_documents(query=request.query, conversation_id=request.conversation_id, k=request.top_k)
        # CHANGED: Access page_content attribute directly
        return [DocumentChunk(page_content=doc.page_content, metadata=doc.metadata) for doc in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during document retrieval: {e}")

# CHANGED: The delete endpoint now calls the new function to delete the entire collection
@app.delete("/delete_by_conversation/{conversation_id}", response_model=DeleteResponse)
async def delete_documents(conversation_id: str):
    """Deletes the entire data collection associated with a specific conversation ID."""
    try:
        delete_collection_for_conversation(conversation_id)
        return {"status": "success", "message": f"Data for conversation ID {conversation_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during document deletion: {e}")