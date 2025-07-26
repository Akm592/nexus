import logging
import os
import uuid
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
import chromadb # Import the native chromadb client

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- START OF FIXES ---

# 1. Define the text_splitter at the module level
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

# 2. Use a local, open-source embedding model from the new package
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2", model_kwargs={'device': 'cpu'})

# 3. Define a persistent directory
PERSIST_DIRECTORY = os.getenv("CHROMA_DB_PERSIST_DIRECTORY", "../../chroma_db_local")

# 4. Use the native ChromaDB client for collection management (create, delete, get)
# This client will manage the database files in the persist directory.
chroma_client = chromadb.PersistentClient(path=PERSIST_DIRECTORY)

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
    
    # Use the LangChain Chroma wrapper specifically for adding documents.
    # It will use the same underlying persistent client and directory.
    Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        collection_name=collection_name,
        persist_directory=PERSIST_DIRECTORY,
        ids=[str(uuid.uuid4()) for _ in range(len(chunks))]
    )
    logging.info(f"Ingested {len(chunks)} chunks from {file_name} into collection '{collection_name}'")

def search_documents(query: str, conversation_id: str, k: int = 4):
    """
    Searches for documents within a specific conversation's collection.
    """
    collection_name = f"conv_{conversation_id.replace('-', '_')}"
    logging.info(f"Searching in collection: {collection_name} for query: '{query}'")

    try:
        logging.info(f"Step 1: Checking if collection '{collection_name}' exists.")
        chroma_client.get_collection(name=collection_name)
        logging.info(f"Step 2: Collection '{collection_name}' found. Initializing vector store.")
        
        vector_store = Chroma(
            persist_directory=PERSIST_DIRECTORY,
            embedding_function=embedding_model,
            collection_name=collection_name
        )
        logging.info("Step 3: Vector store initialized. Performing similarity search.")
        
        results = vector_store.similarity_search(query, k=k)
        logging.info(f"Step 4: Similarity search completed. Found {len(results)} results.")
        return results

    except chromadb.errors.NotFoundError:
        logging.warning(f"Search attempted on non-existent collection: {collection_name}. The collection does not exist.")
        return []
    except Exception as e:
        logging.error(f"An unexpected error occurred during search in collection '{collection_name}': {e}", exc_info=True)
        # Re-raise the exception to be caught by the FastAPI error handler
        raise

def delete_collection_for_conversation(conversation_id: str):
    """
    Deletes the entire collection associated with a conversation ID.
    """
    collection_name = f"conv_{conversation_id.replace('-', '_')}"
    try:
        # Use the native client to delete the collection. This is the correct method.
        chroma_client.delete_collection(name=collection_name)
        logging.info(f"Successfully deleted collection: {collection_name}")
    except ValueError:
        logging.warning(f"Attempted to delete non-existent collection: {collection_name}")
        pass
    except Exception as e:
        logging.error(f"Error deleting collection {collection_name}: {e}")
        raise

# --- END OF FIXES ---