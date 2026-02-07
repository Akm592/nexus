import logging
import os
import hashlib
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
import chromadb

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Improved Configuration ---
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
PERSIST_DIRECTORY = os.getenv("CHROMA_DB_PERSIST_DIRECTORY", "../../chroma_db_local")

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME, model_kwargs={'device': 'cpu'})
chroma_client = chromadb.PersistentClient(path=PERSIST_DIRECTORY)

def _generate_deterministic_id(file_name: str, chunk_content: str) -> str:
    """Generates a deterministic ID for a document chunk."""
    return hashlib.md5(f"{file_name}-{chunk_content}".encode()).hexdigest()

def ingest_document(file_path: str, file_name: str, conversation_id: str):
    """
    Ingests a PDF document into a conversation-specific Chroma collection.
    """
    collection_name = f"conv_{conversation_id.replace('-', '_')}"
    
    try:
        loader = PyMuPDFLoader(file_path)
        documents = loader.load()
    except Exception as e:
        logging.error(f"Failed to load PDF {file_name} for conversation {conversation_id}. It may be corrupted or password-protected. Error: {e}")
        raise ValueError(f"Failed to process PDF: {file_name}. It may be corrupted or password-protected.")

    chunks = text_splitter.split_documents(documents)
    
    ids = [_generate_deterministic_id(file_name, chunk.page_content) for chunk in chunks]

    Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        collection_name=collection_name,
        persist_directory=PERSIST_DIRECTORY,
        ids=ids
    )
    logging.info(f"Ingested {len(chunks)} chunks from {file_name} into collection '{collection_name}'")

def search_documents(query: str, conversation_id: str, k: int = 4):
    """
    Searches for documents within a specific conversation's collection.
    """
    collection_name = f"conv_{conversation_id.replace('-', '_')}"
    logging.info(f"Searching in collection: {collection_name} for query: '{query}'")

    try:
        chroma_client.get_collection(name=collection_name)
        vector_store = Chroma(
            persist_directory=PERSIST_DIRECTORY,
            embedding_function=embedding_model,
            collection_name=collection_name
        )
        results = vector_store.similarity_search(query, k=k)
        logging.info(f"Similarity search completed. Found {len(results)} results.")
        return results
    except ValueError:
        logging.warning(f"Search attempted on non-existent collection: {collection_name}.")
        return []
    except Exception as e:
        logging.error(f"An unexpected error occurred during search in collection '{collection_name}': {e}", exc_info=True)
        raise

def delete_collection_for_conversation(conversation_id: str):
    """
    Deletes the entire collection associated with a conversation ID.
    """
    collection_name = f"conv_{conversation_id.replace('-', '_')}"
    try:
        chroma_client.delete_collection(name=collection_name)
        logging.info(f"Successfully deleted collection: {collection_name}")
    except ValueError:
        logging.warning(f"Attempted to delete non-existent collection: {collection_name}")
        pass