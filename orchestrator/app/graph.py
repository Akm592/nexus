# orchestrator/app/graph.py
import os
import json
import operator
from typing import TypedDict, Annotated, List
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from . import tools # Import our new tools file

# 1. Define the Agent State
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    conversation_id: str

# 2. Define Helper for Creating Agents
def create_agent(llm, tool_list: list, system_prompt: str):
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
    ])
    if tool_list:
        return prompt | llm.bind_tools(tool_list)
    return prompt | llm

# 3. Define the LLM and Agents
llm = ChatOpenAI(
    model="openai/gpt-4o",
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    temperature=0.2, # Lower temperature for more predictable routing
)

# Web Search Agent
web_search_agent = create_agent(
    llm,
    [tools.web_search],
    "You are an expert web researcher. Your job is to generate a search query and use the web_search tool to find the most relevant information."
)
async def web_agent_node(state: AgentState):
    result = await web_search_agent.ainvoke(state)
    return {"messages": [result]}

# Supervisor Agent (our router)
supervisor_prompt = """You are a supervisor routing user requests. Based on the user's query, choose the appropriate agent from the following options:
- 'WebSearchAgent': For questions about recent events, real-time information, or general knowledge.
- 'FinalAnswer': If the user is just making conversation or if the query can be answered directly without tools.

Respond with a single JSON object with one key, 'next_agent', and the chosen agent as the value.
Example: {"next_agent": "WebSearchAgent"}
"""
json_llm = llm.bind(response_format={"type": "json_object"})
supervisor_agent = create_agent(json_llm, [], supervisor_prompt)

async def supervisor_node(state: AgentState):
    result = await supervisor_agent.ainvoke(state)
    # The supervisor's response is the routing decision, which we add to the message history
    return {"messages": [result]}

# 4. Define the Graph
workflow = StateGraph(AgentState)

# Add the nodes
workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("WebSearchAgent", web_agent_node)
tool_node = ToolNode([tools.web_search]) # Add all your tools here in the future
workflow.add_node("tool_executor", tool_node)

# 5. Define the Edges (Routing Logic)
workflow.set_entry_point("Supervisor")

def router(state: AgentState):
    last_message_content = state["messages"][-1].content
    try:
        route_info = json.loads(last_message_content)
        destination = route_info.get("next_agent")
        if destination == 'WebSearchAgent':
            return "WebSearchAgent"
        return "end" # Default to end if 'FinalAnswer' or other
    except json.JSONDecodeError:
        return "end" # If the supervisor fails to produce valid JSON, end the conversation

workflow.add_conditional_edges("Supervisor", router, {
    "WebSearchAgent": "WebSearchAgent",
    "end": END
})

# After the WebSearchAgent calls a tool, the next step is to execute it
workflow.add_edge("WebSearchAgent", "tool_executor")

# After the tool is executed, the result is a ToolMessage. We need to decide what to do next.
# For now, let's just end the process and see the result.
workflow.add_edge("tool_executor", END)


# Compile the graph
agent_graph = workflow.compile()