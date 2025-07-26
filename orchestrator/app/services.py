import logging
import os
import httpx
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.schema import SystemMessage # Added for RAG context as system message
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from typing import List, AsyncGenerator, Tuple
from fastapi import HTTPException, status # Added for HTTPException
from pydantic import AnyUrl # Added for URL validation
from . import crud, schemas, models
from pydantic_settings import BaseSettings, SettingsConfigDict
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Define available models, loaded from an environment variable.
# Example: AVAILABLE_MODELS="google/gemma-2-9b-it:free,qwen/qwen2-72b-instruct:free"
AVAILABLE_MODELS = os.getenv("AVAILABLE_MODELS", "qwen/qwen3-coder:free,qwen/qwen3-235b-a22b-2507:free,moonshotai/kimi-k2:free,google/gemma-3n-e2b-it:free,deepseek/deepseek-r1-0528-qwen3-8b:free").split(",")

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL") # Removed fallback, now required
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

async def process_chat_request(message: str, session_id: str, model_name: str, db) -> dict:
    # Input Validation: Validate the length of the incoming message.
    MAX_MESSAGE_LENGTH = 2000 # Define a reasonable max length
    if len(message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Message too long. Max length is {MAX_MESSAGE_LENGTH} characters.")

    logging.debug(f"RAG_SERVICE_URL: {RAG_SERVICE_URL}")

    # Validate if the selected model is provided.
    if not model_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Model name cannot be empty.")

    # Validate RAG_SERVICE_URL using Pydantic's AnyUrl for robust validation.
    try:
        AnyUrl(RAG_SERVICE_URL) # This will raise a ValueError if the URL is invalid
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid RAG_SERVICE_URL configuration: {e}")


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
                context_str = "\n\n---\n\n".join([doc['page_content'] for doc in retrieved_docs]) # Changed from 'content' to 'page_content'
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
    # Redis history is now managed by RunnableWithMessageHistory

    # Initialize the LLM with the selected model
    llm = ChatOpenAI(
        model=model_name,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.7,
    )

    # Create the conversation chain
    # Using RunnableWithMessageHistory as recommended by LangChain for managing chat history
    system_message_content = "You are a helpful AI assistant."
    if context_str:
        system_message_content += f"\n\nAnswer the user's question based only on the provided context. If the answer is not in the context, state that you do not know. Context: {context_str}"

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_message_content),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    # Define a function to get session history
    def get_session_history(session_id: str) -> RedisChatMessageHistory:
        return RedisChatMessageHistory(
            session_id=session_id,
            url=os.getenv("REDIS_URL", "redis://localhost:6379/0")
        )

    conversation = RunnableWithMessageHistory(
        prompt | llm,
        get_session_history,
        input_messages_key="input",
        history_messages_key="history",
    )

    # 3. CALL THE LLM with the raw user message
    try:
        llm_response = conversation.invoke({"input": message}, config={"configurable": {"session_id": session_id}}) # Pass the raw user message
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
            model="deepseek/deepseek-r1-0528-qwen3-8b:free", # Use a smaller, faster model for titling
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
        new_title = response.content.strip().replace("\"", "")

        crud.update_conversation_title(db, conversation_id, new_title)
        logging.info(f"Updated conversation {conversation_id} title to: {new_title}")

    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        logging.error(f"Error generating title for conversation {conversation_id}: {e}")
    finally:
        db.close()
