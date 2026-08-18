# Setup Guide

This guide explains how to run the full CortexAI project on your machine.

## Requirements

These tools must be installed before you start:

| Tool | Purpose | Notes |
| ---- | ------- | ----- |
| Node.js | Runs the frontend and all backend services | Version 18+ recommended (the project uses modern ESM syntax and Express 5) |
| npm | Package manager | Comes with Node.js |
| Docker | Runs Redis | Required — Redis is essential for sessions and rate limiting |
| MongoDB Atlas (or MongoDB) | Databases | The project uses MongoDB Atlas connection strings; you need an account and one database per service |
| Redis | Sessions + rate limiting | Provided by Docker (see below) |

No message broker (Kafka/RabbitMQ) is used in this project.

### External accounts

The following external services are used and need API keys (see [environment-variables.md](./environment-variables.md)):

- **Firebase** (Google sign-in) — frontend config + Admin service account key
- **Groq** — main LLM used by the Chat/Coding agents
- **Google Gemini** — image generation
- **Together AI** — alternative LLM (defined but not the default)
- **Tavily** — web search
- **Cloudinary** — PDF/PPT/image storage
- **Razorpay** — payments

> You can run the app without every key, but the corresponding features (e.g. search, image generation, payments) will fail or be skipped.

## Clone the Project

```bash
git clone https://github.com/mohdaaftab034/Cortex-AI.git
cd Cortex-AI
```

## Install Dependencies

Dependencies are installed per folder (the project has **no single root `package.json`**).

```bash
# Frontend
cd frontend
npm install

# Backend gateway
cd ../backend/gateway
npm install

# Each backend service
cd ../services/auth && npm install
cd ../services/chat && npm install
cd ../services/agent && npm install
cd ../services/payment && npm install
```

## Environment Variables

Each part of the project reads its own `.env` file. Create the following files **before** starting anything:

| File | Where |
| ---- | ----- |
| `frontend/.env` | `Cortex-AI/frontend/.env` |
| Gateway `.env` | `Cortex-AI/backend/gateway/.env` |
| Auth Service `.env` | `Cortex-AI/backend/services/auth/.env` |
| Chat Service `.env` | `Cortex-AI/backend/services/chat/.env` |
| Agent Service `.env` | `Cortex-AI/backend/services/agent/.env` |
| Payment Service `.env` | `Cortex-AI/backend/services/payment/.env` |

Example minimal files (variable names only — see [environment-variables.md](./environment-variables.md) for the full list):

**`frontend/.env`**

```env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_SERVER_URL=http://localhost:8000
```

**`backend/gateway/.env`**

```env
PORT=8000
AUTH_SERVICE=http://localhost:8001
CHAT_SERVICE=http://localhost:8002
AGENT_SERVICE=http://localhost:8003
PAYMENT_SERVICE=http://localhost:8004
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

**`backend/services/auth/.env`**

```env
PORT=8001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/auth
PAYMENT_SERVICE=http://localhost:8004
REDIS_URL=redis://localhost:6379
```

The auth service also needs the Firebase Admin service account file at `backend/services/auth/serviceAccountKey.json`.

> **Security note:** never commit real `.env` values. The `.env` files in the repository right now contain real keys — replace them with your own values.

## Start Infrastructure

Redis is the only piece of infrastructure defined in Docker. Start it from the `backend/` folder:

```bash
cd backend
docker compose up -d
```

This starts Redis on `localhost:6379`.

To stop Redis later:

```bash
docker compose down
```

## Start Backend Services

The backend has **five separate processes** (gateway + 4 services). Start each one in its **own terminal**.

```bash
# Terminal 1 — API Gateway (port 8000)
cd backend/gateway
npm run dev

# Terminal 2 — Auth Service (port 8001)
cd backend/services/auth
npm run dev

# Terminal 3 — Chat Service (port 8002)
cd backend/services/chat
npm run dev

# Terminal 4 — Agent Service (port 8003)
cd backend/services/agent
npm run dev

# Terminal 5 — Payment Service (port 8004)
cd backend/services/payment
npm run dev
```

Each service prints a message when it starts, e.g. `Gateway Server Started on port 8000`. `npm run dev` uses `nodemon`, so files are watched and the process restarts on changes. Use `npm start` (plain `node`) if you do not want auto-restart.

> **Order:** the Gateway can start before the other services, but the frontend will only work once the Auth Service and Redis are running.

## Start Frontend

```bash
# Terminal 6
cd frontend
npm run dev
```

Vite serves the app at **http://localhost:5173**.

## How Many Terminals Do You Need?

Seven, if you run everything locally:

1. Docker/Redis (can run in the background with `-d`)
2. API Gateway
3. Auth Service
4. Chat Service
5. Agent Service
6. Payment Service
7. Frontend

After starting everything, open http://localhost:5173, click **Continue with Google**, and start chatting.

## Sanity Check

| Component | Check |
| --------- | ----- |
| Frontend | http://localhost:5173 shows the CortexAI login screen |
| Gateway | http://localhost:8000 shows `Gateway Server is running successfully` |
| Auth Service | http://localhost:8001 shows `Auth Server is running successfully` |
| Chat Service | http://localhost:8002 shows `Chat Server is running successfully` |
| Agent Service | http://localhost:8003 shows `Agent Server is running successfully` |
| Payment Service | http://localhost:8004 shows `Payment Server is running successfully` |

If any step fails, see [troubleshooting.md](./troubleshooting.md).