# Nexus - A Modern Web Application Starter

Welcome to Nexus! This repository contains the source code for a full-stack web application built with a modern technology stack. It's designed to be a robust starting point for developing complex applications, featuring a decoupled frontend and backend architecture.

## ✨ Features

*   **Modern Frontend:** Built with **Next.js** and **React**, offering server-side rendering (SSR) and static site generation (SSG) for optimal performance.
*   **Scalable Backend:** Powered by **Python** and **FastAPI**, providing a high-performance, easy-to-use API framework.
*   **Containerized Environment:** Uses **Docker** and **Docker Compose** for consistent development and production environments.
*   **Real-time Capabilities:** Ready for real-time features like chat or notifications.
*   **Utility-First Styling:** Styled with **Tailwind CSS** for a consistent and customizable design system.
*   **TypeScript Support:** End-to-end type safety with **TypeScript** in the frontend.
*   **Modular Architecture:** A clear separation of concerns between the frontend, backend orchestrator, and specialized services (like the RAG service).

## 📂 Project Structure

The project is organized into several key directories:

```
.
├── docker-compose.yml      # Defines and runs the multi-container application
├── frontend/               # Next.js frontend application
│   ├── public/             # Static assets (images, fonts)
│   ├── src/
│   │   ├── app/            # Core application pages and layout
│   │   ├── components/     # Reusable React components
│   │   └── lib/            # Utility functions and shared logic
│   ├── package.json        # Frontend dependencies and scripts
│   └── tailwind.config.ts  # Tailwind CSS configuration
├── orchestrator/           # Main backend service (FastAPI)
│   ├── app/                # Python application code
│   │   ├── main.py         # FastAPI application entrypoint
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic data schemas
│   │   └── crud.py         # CRUD operations for the database
│   └── requirements.txt    # Python dependencies for the orchestrator
└── rag_service/            # Example of a specialized microservice
    ├── app/                # Python application code for the RAG service
    │   └── main.py         # FastAPI entrypoint for the RAG service
    └── requirements.txt    # Python dependencies for the RAG service
```

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

Make sure you have the following software installed:

*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)
*   [Git](https://git-scm.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```

2.  **Build and run the containers:**
    This single command will build the Docker images for each service (if they don't exist) and start them in detached mode (`-d`).

    ```bash
    docker-compose up -d --build
    ```

### Accessing the Application

Once the containers are running, you can access the different parts of the application:

*   **Frontend:** Open your web browser and navigate to `http://localhost:3000`
*   **Backend API (Orchestrator):** The API is available at `http://localhost:8000`. You can access the interactive API documentation (Swagger UI) at `http://localhost:8000/docs`.
*   **RAG Service API:** The RAG service is available at `http://localhost:8001`. You can access its interactive API documentation at `http://localhost:8001/docs`.

### Stopping the Application

To stop all running containers, use the following command:

```bash
docker-compose down
```

This will stop and remove the containers and the network created by `docker-compose up`.

## 🔧 Local Development (Without Docker)

If you prefer to run the services locally without Docker, you can follow these steps.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [Python](https://www.python.org/) (v3.9 or later)
*   `pip` (Python's package installer)

### Running the Frontend

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

### Running the Backend (Orchestrator)

1.  In a new terminal, navigate to the `orchestrator` directory:
    ```bash
    cd orchestrator
    ```
2.  Create a virtual environment (recommended):
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the FastAPI server:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    The orchestrator API will be available at `http://localhost:8000`.

*(Repeat the backend steps for the `rag_service` on a different port, e.g., 8001, if you need to run it locally as well.)*
