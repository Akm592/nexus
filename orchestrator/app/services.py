import logging
import os
import httpx
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.schema import SystemMessage # Added for RAG context as system message
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from typing import List, AsyncGenerator, Tuple
from . import crud, schemas, models

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Define available models
AVAILABLE_MODELS = [
    "google/gemma-2-9b-it:free",
    "qwen/qwen2-72b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "deepseek/deepseek-chat:free",
]

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:8002")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

async def process_chat_request(message: str, session_id: str, model_name: str, db) -> dict:
    logging.debug(f"RAG_SERVICE_URL: {RAG_SERVICE_URL}")


    # Validate if the selected model is in the allowed list
    if model_name not in AVAILABLE_MODELS:
        # Fallback to a default model
        model_name = "google/gemma-2-9b-it:free"

    # 1. RETRIEVE CONTEXT FROM RAG SERVICE
    context_str = ""
    sources = []
    try:
        async with httpx.AsyncClient() as client:
            # Ensure the URL is explicitly formed with http:// or https://
            rag_url = RAG_SERVICE_URL if RAG_SERVICE_URL.startswith(("http://", "https://")) else f"http://{RAG_SERVICE_URL}"
            response = await client.post(f"{rag_url}/retrieve", json={"query": message, "conversation_id": session_id})
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            retrieved_docs = response.json()
            if retrieved_docs:
                context_str = "\n\n---\n\n".join([doc['content'] for doc in retrieved_docs])
                sources = [doc['metadata'] for doc in retrieved_docs]
    except httpx.RequestError as e:
        logging.error(f"RAG service request failed: {e}")
        return {"reply": f"Error: Could not connect to RAG service. ({e})", "sources": []}
    except httpx.HTTPStatusError as e:
        logging.error(f"RAG service returned HTTP error: {e.response.status_code} - {e.response.text}")
        return {"reply": f"Error: RAG service returned an error. ({e.response.status_code})", "sources": []}
    except Exception as e:
        logging.error(f"Unexpected error during RAG service call: {e}")
        return {"reply": f"Error: An unexpected error occurred with RAG service. ({e})", "sources": []}

    # --- START: MEMORY SETUP ---
    # This completely replaces loading from the SQL DB for memory purposes.
    # The SQL DB now serves as permanent, long-term storage, not active memory.
    redis_history = RedisChatMessageHistory(
        session_id=session_id,
        url=os.getenv("REDIS_URL", "redis://localhost:6379/0")
    )

    # Add RAG context as a system message to the history
    if context_str:
        redis_history.add_message(SystemMessage(content=f"Answer the user's question based only on the provided context. If the answer is not in the context, state that you do not know. Context: {context_str}"))

    memory = ConversationBufferMemory(
        memory_key="history",
        chat_memory=redis_history, # Use the Redis history backend
        return_messages=True
    )
    # --- END: MEMORY SETUP ---

    # Initialize the LLM with the selected model
    llm = ChatOpenAI(
        model=model_name,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.7,
    )

    # Create the conversation chain
    conversation = ConversationChain(
        llm=llm,
        memory=memory,
        verbose=True
    )

    # 3. CALL THE LLM with the raw user message
    try:
        llm_response = conversation.invoke(input={"input": message}) # Pass the raw user message
        return {"reply": llm_response.get('response', ''), "sources": sources}
    except Exception as e:
        print(f"ERROR: LLM invocation failed: {e}")
        return {"reply": f"Error: LLM response failed. ({e})", "sources": []}

async def generate_title_for_conversation(conversation_id: str, SessionLocal):
    db = SessionLocal()
    try:
        messages = crud.get_messages_by_conversation(db, conversation_id=conversation_id)
        if len(messages) < 2: # Need at least user and bot message
            return

        # Construct a summary prompt from the first few messages
        conversation_summary = ""
        for msg in messages[:4]: # Consider first 4 messages for summary
            conversation_summary += f"{msg.role}: {msg.content}\n"

        title_llm = ChatOpenAI(
            model="google/gemma-2-9b-it:free", # Use a smaller, faster model for titling
            openai_api_key=os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.3,
        )

        title_prompt = f"""
        Summarize the following conversation into a short, 5-word-or-less title. 
        The title should be concise and descriptive of the conversation's main topic.
        Conversation: {conversation_summary}
        Title:"""
        
        response = title_llm.invoke(title_prompt)
        new_title = response.strip().replace("\"", "")

        crud.update_conversation_title(db, conversation_id, new_title)
        logging.info(f"Updated conversation {conversation_id} title to: {new_title}")

    except Exception as e:
        logging.error(f"Error generating title for conversation {conversation_id}: {e}")
    finally:
        db.close()
