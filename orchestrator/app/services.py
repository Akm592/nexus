import logging
from .graph import agent_graph
import os
import httpx

from dotenv import load_dotenv
from fastapi import HTTPException, status
from . import crud, schemas, models
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Define available models, loaded from an environment variable.
# Example: AVAILABLE_MODELS="google/gemma-2-9b-it:free,qwen/qwen2-72b-instruct:free"
AVAILABLE_MODELS = os.getenv("AVAILABLE_MODELS", "qwen/qwen3-coder:free,qwen/qwen3-235b-a22b-2507:free,moonshotai/kimi-k2:free,google/gemma-3n-e2b-it:free,deepseek/deepseek-r1-0528-qwen3-8b:free,deepseek/deepseek-chat-v3.1:free").split(",")



async def process_chat_request(message: str, session_id: str, db) -> dict:
    """
    Processes a chat request using the multi-agent graph.
    """
    logging.info(f"Processing chat for session {session_id} with new agent graph.")
    
    # The input to the graph is a dict mapping to the AgentState
    graph_input = {
        "messages": [HumanMessage(content=message)],
        "conversation_id": session_id
    }

    # Use a config to identify the conversation thread for stateful execution
    config = {"configurable": {"thread_id": session_id}}

    try:
        # Astream gives us all the intermediate steps. Invoke gives just the final state.
        final_state = await agent_graph.ainvoke(graph_input, config=config)
        
        # The final answer is the last message in the state
        last_message: BaseMessage = final_state['messages'][-1]
        
        # If the last message is a tool result, we should format it nicely
        if isinstance(last_message, ToolMessage):
             reply = f"I have finished the task. The result is:\n\n{last_message.content}"
        else:
             reply = last_message.content

        # Clean up any routing instructions from the reply
        reply = reply.replace('{"next_agent": "FinalAnswer"}', "").strip()

        return {"reply": reply, "sources": []} # We can enhance sources later

    except Exception as e:
        logging.error(f"Error during agent graph execution for session {session_id}: {e}", exc_info=True)
        return {"reply": "Sorry, I encountered an error and couldn't process your request.", "sources": []}

