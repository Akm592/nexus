import logging
import os
import httpx
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.schema import SystemMessage # Added for RAG context as system message
from langchain_openai import ChatOpenAI
from langchain_community.chat_models import ChatOllama # New: Import ChatOllama
from dotenv import load_dotenv
from typing import List, AsyncGenerator, Tuple, Optional
from fastapi import HTTPException, status # Added for HTTPException
from pydantic import AnyUrl # Added for URL validation
from . import crud, schemas, models, ollama_client # New: Import ollama_client
from pydantic_settings import BaseSettings, SettingsConfigDict
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Define available models, loaded from an environment variable.
# Example: AVAILABLE_MODELS="google/gemma-2-9b-it:free,qwen/qwen2-72b-instruct:free"
AVAILABLE_MODELS = os.getenv("AVAILABLE_MODELS", "qwen/qwen3-coder:free,qwen/qwen3-235b-a22b-2507:free,moonshotai/kimi-k2:free,google/gemma-3n-e2b-it:free,deepseek/deepseek-r1-0528-qwen3-8b:free").split(",")

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL") # Removed fallback, now required
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

async def process_chat_request(message: str, session_id: str, model_name: Optional[str], system_prompt: Optional[str], temperature: Optional[float], db) -> dict:
    # Input Validation: Validate the length of the incoming message.
    MAX_MESSAGE_LENGTH = 2000 # Define a reasonable max length
    if len(message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Message too long. Max length is {MAX_MESSAGE_LENGTH} characters.")

    logging.debug(f"RAG_SERVICE_URL: {RAG_SERVICE_URL}")

    # Use provided model_name or default
    final_model_name = model_name if model_name else AVAILABLE_MODELS[0] if AVAILABLE_MODELS else "qwen/qwen2-72b-instruct:free"

    # Validate RAG_SERVICE_URL using Pydantic's AnyUrl for robust validation.
    try:
        if RAG_SERVICE_URL:
            AnyUrl(RAG_SERVICE_URL)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid RAG_SERVICE_URL configuration: {e}")


    # 1. RETRIEVE CONTEXT FROM RAG SERVICE (if configured)
    context_str = ""
    sources = []
    if RAG_SERVICE_URL:
        try:
            async with httpx.AsyncClient() as client:
                rag_url = RAG_SERVICE_URL if RAG_SERVICE_URL.startswith(("http://", "https://")) else f"http://{RAG_SERVICE_URL}"
                response = await client.post(f"{rag_url}/retrieve", json={"query": message, "conversation_id": session_id})
                response.raise_for_status()
                retrieved_docs = response.json()
                if retrieved_docs:
                    context_str = "\n\n---\n\n".join([doc['page_content'] for doc in retrieved_docs])
                    sources = [doc['metadata'] for doc in retrieved_docs]
        except httpx.RequestError as e:
            logging.error(f"RAG service request failed: {e}")
            # Non-fatal error: proceed without context but inform the user.
            return {"reply": "I am having trouble accessing my knowledge base right now. I can still chat, but my responses will be limited.", "sources": []}
        except Exception as e:
            logging.error(f"Unexpected error during RAG service call: {e}")
            # Non-fatal error: proceed without context
            pass # Or return a specific error message if RAG is critical

    # Initialize the LLM
    ollama_models = await ollama_client.list_local_models()
    local_model_names = [m['name'] for m in ollama_models.get('models', [])]

    if final_model_name in local_model_names:
        logging.info(f"Using local Ollama model: {final_model_name}")
        llm = ChatOllama(
            model=final_model_name,
            base_url=os.getenv("OLLAMA_API_URL", "http://localhost:11434"),
            temperature=temperature if temperature is not None else 0.7,
        )
    else:
        logging.info(f"Using OpenRouter model: {final_model_name}")
        llm = ChatOpenAI(
            model=final_model_name,
            openai_api_key=os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=temperature if temperature is not None else 0.7,
        )

    # Define a better default system prompt that requests Markdown
    default_system_prompt = "You are a helpful AI assistant. Format your responses using Markdown. Use headings, lists, bold text, and code blocks where appropriate to improve readability."
    
    # Use the user's provided system prompt or the new default
    system_message_content = system_prompt if system_prompt else default_system_prompt

    # Append RAG context instructions if context was retrieved
    if context_str:
        system_message_content += f"\n\nUse the following context to answer the user's question. If the answer is not in the context, state that you do not have that information. Do not mention the context in your answer. \n\n---\n\nCONTEXT:\n{context_str}"

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_message_content),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

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

    try:
        llm_response = await conversation.ainvoke({"input": message}, config={"configurable": {"session_id": session_id}})
        return {"reply": llm_response.content, "sources": sources}
    except Exception as e:
        logging.error(f"LLM invocation failed: {e}")
        raise HTTPException(status_code=500, detail=f"LLM response failed: {e}")
    
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
