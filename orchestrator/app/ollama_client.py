import httpx
import os

OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")

async def list_local_models():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{OLLAMA_API_URL}/api/tags")
        response.raise_for_status()
        return response.json()

async def pull_model(model_name: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{OLLAMA_API_URL}/api/pull", json={"name": model_name})
        response.raise_for_status()
        return response

async def delete_model(model_name: str):
    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{OLLAMA_API_URL}/api/delete", json={"name": model_name})
        response.raise_for_status()
        return response

async def get_model_info(model_name: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{OLLAMA_API_URL}/api/show", json={"name": model_name})
        response.raise_for_status()
        return response.json()
