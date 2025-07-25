import logging
import os
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader

import uuid

# Use a local, open-source embedding model that runs on the CPU
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Define a persistent directory in the project root
PERSIST_DIRECTORY = os.getenv("CHROMA_DB_PERSIST_DIRECTORY", "../../chroma_db_local")

vectorstore_instance = None

def get_vectorstore():
    """Get or create a persistent Chroma vector store"""
    global vectorstore_instance
    if vectorstore_instance is None:
        if not os.path.exists(PERSIST_DIRECTORY):
            os.makedirs(PERSIST_DIRECTORY)
        
        vectorstore_instance = Chroma(
            persist_directory=PERSIST_DIRECTORY,
            embedding_function=embedding_model
        )
    return vectorstore_instance

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    vectorstore = vectorstore if vectorstore else get_vectorstore()
    
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else: # Assume it's a text file
        loader = TextLoader(file_path)
        
    documents = loader.load()
    chunks = text_splitter.split_documents(documents)
    
    # Add conversation_id to each chunk's metadata
    for chunk in chunks:
        if chunk.metadata is None:
            chunk.metadata = {}
        chunk.metadata["conversation_id"] = conversation_id

    vectorstore.add_documents(chunks, ids=[str(uuid.uuid4()) for _ in range(len(chunks))])
    logging.info(f"Ingested {len(chunks)} chunks from {file_name} for conversation {conversation_id}")

def search_documents(query: str, conversation_id: str, k: int = 4, vectorstore=None):
    vectorstore = vectorstore if vectorstore else get_vectorstore()
    # The filter MUST be passed in the search_kwargs of the as_retriever method.
    retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": k,
            "filter": {
                "conversation_id": conversation_id
            }
        }
    )
    # The invoke method should just take the query.
    # The incorrect `config` parameter has been removed.
    return retriever.invoke(query)

def delete_documents_by_conversation_id(conversation_id: str, vectorstore=None):
    vectorstore = vectorstore if vectorstore else get_vectorstore()
    chroma_client = vectorstore._collection
    
    results = chroma_client.get(
        where={"conversation_id": conversation_id},
        include=[] # We only need the IDs
    )
    
    ids_to_delete = results.get('ids', [])
    
    if ids_to_delete:
        vectorstore.delete(ids=ids_to_delete)
        logging.info(f"Deleted {len(ids_to_delete)} documents for conversation ID: {conversation_id}")
    else:
        print(f"No documents found for conversation ID: {conversation_id}")