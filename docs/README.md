# CortexAI Documentation

Welcome to the CortexAI documentation. This guide is written for developers who are new to the project. It explains what the project does, how the frontend works, how the backend works, and how everything fits together.

## What the Project Does

CortexAI is an AI assistant web app. A user:

1. Signs in with their Google account.
2. Starts a chat conversation.
3. Picks an agent (Auto, Chat, Coding, Search, PDF, PPT, Vision) or lets the AI choose automatically.
4. Receives an AI response. For coding requests the app shows generated files in a code viewer; for PDF/PPT/Image requests the app shows the generated file.
5. Consumes **credits** for each request. Users can upgrade to paid plans through Razorpay.

## Main Technologies

| Area | Technology |
| ---- | ---------- |
| Frontend | React 19, Vite 8, Tailwind CSS 4, Redux Toolkit, Axios, Firebase |
| Backend | Node.js (ESM), Express 5 |
| Backend patterns | Microservices + API Gateway, LangChain/LangGraph multi-agent graph |
| Databases | MongoDB (Mongoose) — one database per service |
| Cache / sessions | Redis |
| External APIs | Google (Firebase Auth), Groq, Google Gemini, Together AI, Tavily, Cloudinary, Razorpay |

## Overall Architecture

```text
User (Browser)
     ↓
React Frontend  (frontend/)
     ↓  HTTP + session cookie
API Gateway  (backend/gateway/, port 8000)
     ├──► Auth Service    (backend/services/auth/,    8001)
     ├──► Chat Service    (backend/services/chat/,    8002)
     ├──► Agent Service   (backend/services/agent/,   8003)
     └──► Payment Service (backend/services/payment/, 8004)
                    ↓
         MongoDB (one DB per service) + Redis
```

The frontend **only** talks to the API Gateway. The gateway checks the session cookie in Redis, then forwards each request to the correct service. Services also talk to each other directly over HTTP (e.g. Agent → Chat to save messages, Agent → Payment to deduct credits).

## Where Everything Lives

- **Frontend:** `frontend/`
- **Backend:** `backend/`
  - **API Gateway:** `backend/gateway/`
  - **Auth Service:** `backend/services/auth/`
  - **Chat Service:** `backend/services/chat/`
  - **Agent Service:** `backend/services/agent/`
  - **Payment Service:** `backend/services/payment/`
  - **Shared code:** `backend/shared/`

## Microservices Overview

| Service | Port | Purpose |
| ------- | ---- | ------- |
| API Gateway | 8000 | Entry point, session check, routing |
| Auth Service | 8001 | Google login/logout, session creation |
| Chat Service | 8002 | Conversations and messages |
| Agent Service | 8003 | Runs the AI agents |
| Payment Service | 8004 | Credits, plans, Razorpay payments |

Each service has its own MongoDB database and its own environment variables.

## Quick Start

```bash
# 1. Redis (from backend/)
cd backend
docker compose up -d

# 2. Backend services — one terminal each
cd backend/gateway && npm install && npm run dev
cd backend/services/auth && npm install && npm run dev
cd backend/services/chat && npm install && npm run dev
cd backend/services/agent && npm install && npm run dev
cd backend/services/payment && npm install && npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

> **Important:** each folder needs its own `.env` file before the services will start. See [setup.md](./setup.md) and [environment-variables.md](./environment-variables.md).

## Documentation

- [Setup](./setup.md) — requirements and step-by-step local setup
- [Project Structure](./project-structure.md) — folder-by-folder explanation
- [Architecture](./architecture.md) — how the whole system fits together
- [Frontend](./frontend.md) — React app, components, state, API integration
- [Backend](./backend.md) — backend overview
- [Microservices](./microservices.md) — what each service is and why it exists
- [API Gateway](./api-gateway.md) — how requests are routed and protected
- [Services](./services.md) — detailed documentation for every service
- [API](./api.md) — every endpoint with request/response examples
- [Authentication](./authentication.md) — login, sessions, protected routes
- [Database](./database.md) — MongoDB databases, models, and collections
- [Service Communication](./service-communication.md) — how services call each other
- [Environment Variables](./environment-variables.md) — all configuration variables
- [Docker](./docker.md) — Dockerfiles and Docker Compose
- [Data Flow](./data-flow.md) — end-to-end application flows
- [Deployment](./deployment.md) — deployment guidance
- [Troubleshooting](./troubleshooting.md) — common problems and fixes