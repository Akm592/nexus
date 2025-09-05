# In orchestrator/app/memory_manager.py
import logging
from langchain_openai import ChatOpenAI
from . import tools # We will add more to tools.py later

async def load_context_for_agent(state: dict) -> dict:
    """
    Simulates a MemGPT-like manager. Before an agent acts,
    it retrieves relevant memories and injects them into the context.
    """
    conversation_id = state['conversation_id']
    user_query = state['messages'][-1].content
    
    logging.info(f"Loading context for conversation {conversation_id}...")
    
    # 1. Retrieve from Long-Term Memory (Vector Store)
    # We use our existing RAG tool for this
    long_term_memory = await tools.knowledge_base_search(user_query, conversation_id)
    
    # 2. (Future) Retrieve from Relational Memory (Graph DB)
    # graph_memory = await get_graph_memory(user_query, conversation_id)
    
    # 3. Inject into scratchpad
    state['scratchpad'] = {
        "long_term_memory": long_term_memory,
        # "graph_memory": graph_memory,
    }
    
    # You could also modify the `messages` list to inject a system message with this context
    logging.info("Context loaded.")
    return state
