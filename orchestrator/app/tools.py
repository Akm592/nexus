# orchestrator/app/tools.py
import os
from langchain.tools import tool
from tavily import TavilyClient
from pydantic import BaseModel, Field

# Initialize the Tavily client
try:
    TAVILY_API_KEY = os.environ["TAVILY_API_KEY"]
    tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
except KeyError:
    raise Exception("Please set the TAVILY_API_KEY environment variable.")

# Define the input schema for the tool
class WebSearchInput(BaseModel):
    query: str = Field(description="The search query for the web search.")

@tool("web_search", args_schema=WebSearchInput, return_direct=False)
def web_search(query: str) -> str:
    """
    Performs a web search to find real-time information, news, or general knowledge.
    Use this for questions about recent events or topics not covered in the local knowledge base.
    """
    try:
        results = tavily_client.search(query=query, search_depth="advanced", max_results=3)
        snippets = [obj["content"] for obj in results["results"]]
        if not snippets:
            return "No results found for the query."
        return "Web search results:\n\n" + "\n\n---\n\n".join(snippets)
    except Exception as e:
        return f"Error performing web search: {e}"