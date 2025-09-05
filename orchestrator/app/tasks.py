import logging
import os
from . import crud
from langchain_openai import ChatOpenAI

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def generate_title_for_conversation(conversation_id: str, SessionLocal):
    """
    Generates and updates the title for a conversation based on its initial messages.
    """
    db = SessionLocal()
    try:
        messages = crud.get_messages_by_conversation(db, conversation_id, limit=2)
        if len(messages) < 2:
            return

        user_message = messages[0].content
        bot_message = messages[1].content
        
        # Prepare the prompt for the LLM
        prompt_text = f"Summarize the following conversation with a short, concise title (less than 5 words). \n\nUser: {user_message}\nAssistant: {bot_message}"
        
        # Initialize a simple, fast LLM for title generation
        llm = ChatOpenAI(
            model="gpt-3.5-turbo", # Or another fast model
            openai_api_key=os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.2,
        )
        
        # Generate the title
        response = await llm.ainvoke(prompt_text)
        title = response.content.strip().strip('"')

        # Update the conversation title in the database
        crud.update_conversation_title(db, conversation_id, title)
        logging.info(f"Generated title for conversation {conversation_id}: {title}")

    except Exception as e:
        logging.error(f"Error generating title for conversation {conversation_id}: {e}")
    finally:
        db.close()
