# CortexAI

CortexAI is an AI assistant web application with multiple specialized AI agents. Users log in with Google, chat with the AI, generate code, search the web, and create PDFs, PowerPoint presentations, and images. It uses a **React frontend** and a **Node.js microservices backend**.

## Features

- Google sign-in (Firebase Authentication)
- Multi-agent AI chat: **Auto**, **Chat**, **Coding**, **Search**, **PDF**, **PPT**, and **Vision**
- Streaming (SSE) and non-streaming AI responses
- Code generation with multi-file **Artifact** viewer (source + live preview)
- PDF generation (PDFKit) and PPT generation (PptxGenJS), stored on Cloudinary
- Web search with live sources (Tavily)
- Image generation (Google Gemini)
- Conversation history stored per user
- Credit-based billing with **Free**, **Pro**, and **Business** plans (Razorpay)
- Rate limiting and session-based authentication

## Architecture

The app is split into two top-level directories:

- `frontend/` — React + Vite single-page application
- `backend/` — a microservices backend:

  - **API Gateway** (port 8000) — single entry point for the frontend, forwards requests to the right service and checks sessions
  - **Auth Service** (8001) — Firebase login/logout, creates sessions in Redis
  - **Chat Service** (8002) — conversations and messages (MongoDB)
  - **Agent Service** (8003) — the AI agents (LangChain/LangGraph)
  - **Payment Service** (8004) — credits, plans, and Razorpay payments

All services share **MongoDB** (one database each) and **Redis** (sessions + rate limiting).

```text
Browser
   ↓
React Frontend
   ↓
API Gateway ──► Auth / Chat / Agent / Payment Services
                       ↓
                  MongoDB + Redis + external APIs (Google, Groq, Gemini, Tavily, Cloudinary, Razorpay)
```

## Tech Stack

**Frontend:**

- React 19, Vite 8, Tailwind CSS 4
- Redux Toolkit, Axios, Firebase (Google Auth)
- react-markdown, react-pdf, react-syntax-highlighter

**Backend:**

- Node.js (ES Modules), Express 5
- API Gateway with `express-http-proxy`
- Auth Service with `firebase-admin`
- Agent Service with LangChain / LangGraph (Groq, Google Gemini, Together AI, Tavily, Cloudinary)
- Payment Service with Razorpay

**Database:**

- MongoDB (via Mongoose) — one database per service
- Redis — sessions and rate limiting

**Infrastructure:**

- Docker (Dockerfiles per service + Docker Compose for Redis)
- External services: Firebase, MongoDB Atlas, Redis, Groq, Google Gemini, Together AI, Tavily, Cloudinary, Razorpay

## Project Structure

```text
Cortex-AI/
├── frontend/          # React + Vite app
└── backend/
    ├── gateway/       # API Gateway (port 8000)
    ├── services/
    │   ├── auth/      # Auth Service (8001)
    │   ├── chat/      # Chat Service (8002)
    │   ├── agent/     # Agent Service (8003)
    │   └── payment/   # Payment Service (8004)
    ├── shared/        # Redis client, rate limiter, credit middleware
    └── docker-compose.yml
```

## Getting Started

1. Install [Node.js](https://nodejs.org) (version 18+) and [Docker](https://www.docker.com).
2. Clone the repository.
3. Start Redis: `docker compose up -d` (inside `backend/`).
4. Create a `.env` file in `frontend/` and in each backend folder (`backend/gateway/`, `backend/services/auth/`, `backend/services/chat/`, `backend/services/agent/`, `backend/services/payment/`).
5. Install dependencies and run the services.

The complete step-by-step guide is in [docs/setup.md](./docs/setup.md).

## Environment Variables

Every part of the project is configured with environment variables. These include ports, service URLs, database connection strings, Redis, and API keys for Firebase, Groq, Gemini, Together AI, Tavily, Cloudinary, and Razorpay.

See [docs/environment-variables.md](./docs/environment-variables.md) for the full list (variable names only — never commit real secrets).

## Documentation

Complete, beginner-friendly documentation lives in the [`docs/`](./docs/) directory:

- [docs/README.md](./docs/README.md) — documentation homepage and navigation
- [docs/setup.md](./docs/setup.md) — local setup guide
- [docs/project-structure.md](./docs/project-structure.md) — folder layout
- [docs/architecture.md](./docs/architecture.md) — system architecture
- [docs/frontend.md](./docs/frontend.md) — the React frontend
- [docs/backend.md](./docs/backend.md) — backend overview
- [docs/microservices.md](./docs/microservices.md) — the microservices
- [docs/api-gateway.md](./docs/api-gateway.md) — API Gateway
- [docs/services.md](./docs/services.md) — detailed service documentation
- [docs/api.md](./docs/api.md) — API reference
- [docs/authentication.md](./docs/authentication.md) — authentication flow
- [docs/database.md](./docs/database.md) — databases and models
- [docs/service-communication.md](./docs/service-communication.md) — how services talk to each other
- [docs/environment-variables.md](./docs/environment-variables.md) — environment variables
- [docs/docker.md](./docs/docker.md) — Docker setup
- [docs/data-flow.md](./docs/data-flow.md) — important application flows
- [docs/deployment.md](./docs/deployment.md) — deployment notes
- [docs/troubleshooting.md](./docs/troubleshooting.md) — common problems and fixes

## Running the Project

You need multiple terminals because each backend service runs as its own process.

```bash
# 1. Redis (terminal 1)
cd backend
docker compose up

# 2. Backend services (one terminal each)
cd backend/gateway && npm install && npm run dev
cd backend/services/auth && npm install && npm run dev
cd backend/services/chat && npm install && npm run dev
cd backend/services/agent && npm install && npm run dev
cd backend/services/payment && npm install && npm run dev

# 3. Frontend (terminal 7)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Deployment

No deployment configuration is currently included in the repository. See [docs/deployment.md](./docs/deployment.md) for guidance on deploying the frontend (static hosting) and each backend service (containers or Node.js hosting), plus the external services each one needs.