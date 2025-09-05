# GEMINI.md

## Project Overview

This project is a full-stack web application called Nexus. It features a modern, decoupled architecture with a Next.js/React frontend and a Python/FastAPI backend. The application is designed as a conversational AI assistant, with real-time chat capabilities and a modular structure that includes a main backend orchestrator and a specialized RAG (Retrieval-Augmented Generation) service. The entire environment is containerized using Docker for consistent development and deployment.

**Key Technologies:**

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Backend (Orchestrator):** Python, FastAPI, SQLAlchemy
*   **RAG Service:** Python, FastAPI, LangChain, ChromaDB
*   **Containerization:** Docker, Docker Compose

## Building and Running

The project can be run in two ways: using Docker (recommended for a consistent environment) or by running each service locally.

### With Docker

This is the simplest way to get the entire application running.

**Prerequisites:**

*   Docker
*   Docker Compose

**Commands:**

1.  **Build and Start:** This command builds the images for all services and starts them in detached mode.

    ```bash
    docker-compose up -d --build
    ```

2.  **Accessing Services:**
    *   **Frontend:** `http://localhost:3000`
    *   **Orchestrator API:** `http://localhost:8001` (Container port `8000`, docs at `http://localhost:8001/docs`)
    *   **RAG Service API:** `http://localhost:8002` (Container port `8002`, docs at `http://localhost:8002/docs`)

3.  **Stopping the Application:**

    ```bash
    docker-compose down
    ```

### Local Development (Without Docker)

This method is suitable for developing a specific service.

**Prerequisites:**

*   Node.js (v18+)
*   Python (v3.9+)

**Commands:**

*   **Frontend:**

    ```bash
    cd frontend
    npm install
    npm run dev
    ```

*   **Backend (Orchestrator):**

    ```bash
    cd orchestrator
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8001
    ```

*   **RAG Service:**

    ```bash
    cd rag_service
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8002
    ```

## Development Conventions

*   **Modular Architecture:** The project is divided into three main services: `frontend`, `orchestrator`, and `rag_service`. Each service is self-contained in its directory with its own dependencies and configuration.
*   **API Communication:** The frontend communicates with the `orchestrator` service, which in turn can communicate with other services like the `rag_service`.
*   **Styling:** The frontend uses Tailwind CSS for utility-first styling. Components are built using Shadcn UI.
*   **State Management:** The frontend uses Zustand (inferred from `useChatStore`) for managing global state.
*   **Linting:** The frontend has a linting script (`npm run lint`) to enforce code quality.
*   **Type Safety:** The frontend uses TypeScript for end-to-end type safety.
*   **Database:** The orchestrator uses a SQLite database, which is persisted in the `database` directory. The RAG service uses ChromaDB for the vector store, persisted in `database/chroma_db`.
