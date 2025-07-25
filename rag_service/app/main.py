import logging
import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

from .core import ingest_document, search_documents, delete_documents_by_conversation_id, get_vectorstore



# Dependency to get the vectorstore instance
def get_vectorstore_dependency():
    return get_vectorstore()

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), conversation_id: str = Form(...), vectorstore = Depends(get_vectorstore_dependency)):
    # Validate content type
    allowed_content_types = ["application/pdf", "text/plain"]
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Only PDF and text files are allowed.")
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_file_path = temp_file.name

    try:
        ingest_document(temp_file_path, file.filename, conversation_id, vectorstore)
        return {"status": "success", "filename": file.filename, "conversation_id": conversation_id}
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"File operation error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file for ingestion: {e}")
    finally:
        os.unlink(temp_file_path) # Ensure the temporary file is deleted

class SearchRequest(BaseModel):
    query: str
    conversation_id: str
    top_k: int = 3 # Allow specifying how many chunks to retrieve

class DocumentChunk(BaseModel):
    content: str
    metadata: dict # Will contain the source filename, page number, etc.

@app.post("/retrieve", response_model=list[DocumentChunk])
async def retrieve_documents(request: SearchRequest, vectorstore = Depends(get_vectorstore_dependency)):
    """Retrieves relevant document chunks from the vector store."""
    try:
        results = search_documents(query=request.query, conversation_id=request.conversation_id, k=request.top_k, vectorstore=vectorstore)
        return [DocumentChunk(content=doc.page_content, metadata=doc.metadata) for doc in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during document retrieval: {e}")

@app.delete("/delete_by_conversation/{conversation_id}", response_model=DeleteResponse)
async def delete_documents(conversation_id: str, vectorstore = Depends(get_vectorstore_dependency)):
    """Deletes documents associated with a specific conversation ID from the vector store."""
    try:
        delete_documents_by_conversation_id(conversation_id, vectorstore)
        return {"status": "success", "message": f"Documents for conversation ID {conversation_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during document deletion: {e}")