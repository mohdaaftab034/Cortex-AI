# Microservices

## What Is a Microservice in This Project?

A microservice is a **separate, self-contained Node.js server** that owns one piece of the backend. Each service:

- has its own folder under `backend/services/` (or `backend/gateway/` for the gateway),
- has its own `package.json`, dependencies, and `.env` file,
- connects to its own MongoDB database (except the gateway, which uses Redis),
- runs as its own process on its own port,
- exposes its own HTTP API.

The frontend never talks to the services directly — every request goes through the **API Gateway**, which checks the session and forwards the request to the right service.

## Services Overview

| Service | Location | Port | Database | Main Responsibility |
| ------- | -------- | ---- | -------- | ------------------- |
| API Gateway | `backend/gateway/` | 8000 | Redis (sessions, rate limits) | Entry point, session check, routing |
| Auth Service | `backend/services/auth/` | 8001 | MongoDB `auth` | Google login/logout, sessions, users |
| Chat Service | `backend/services/chat/` | 8002 | MongoDB `chat` | Conversations and messages |
| Agent Service | `backend/services/agent/` | 8003 | MongoDB `agent` | Runs the AI agents, generates files |
| Payment Service | `backend/services/payment/` | 8004 | MongoDB `payment` | Credits, plans, Razorpay payments |

> Note: the Agent Service connects to MongoDB but defines **no models** in the code — the connection is there, but the agent logic doesn't store anything in its database directly.

## How Services Communicate

- The **API Gateway** forwards client requests to the other services over HTTP and adds an `x-user-id` header.
- Services call each other **directly over HTTP** (REST) using `axios`:
  - Auth → Payment: initialize the user's credit account.
  - Gateway → Payment: fetch credits for `/api/me`.
  - Agent → Payment: deduct a credit per AI request.
  - Agent → Chat: save messages and update conversation titles.
- **Redis** is shared for sessions and rate limiting.
- There is **no message broker** — no events, queues, or pub/sub.

Detailed diagrams: [service-communication.md](./service-communication.md).

## The API Gateway (port 8000)

Why it exists:

- Gives the frontend **one URL** (`http://localhost:8000`) instead of four.
- **Centralizes authentication**: the `protect` middleware validates the `session` cookie in Redis once, for every protected route.
- **Routes requests** to the correct service and adds the `x-user-id` header, so services know who the user is.

```text
Frontend
   ↓
API Gateway (checks session in Redis, rate-limits /api/agent)
   ↓
Correct Microservice (auth / chat / agent / payment)
```

See [api-gateway.md](./api-gateway.md).

## The Auth Service (port 8001)

**What it does:** authenticates users with Google.

**Why it exists:** a dedicated service for identity. It verifies Google ID tokens, stores users in its own database, and creates the session used everywhere else.

**Main responsibilities:**

- Verify the Firebase ID token from the login request.
- Find the user or create one in MongoDB (`firebaseUid`, `name`, `email`, `avatar`).
- Store a session in Redis and set the `session` cookie.
- Notify the Payment Service to create the user's credit account on first login.
- Remove the session and cookie on logout.

**Important API:** `POST /login`, `GET /logout`.

**Communication:** Auth → Redis (sessions), Auth → Payment (`POST /api/payment/credits/init`).

## The Chat Service (port 8002)

**What it does:** stores conversations and messages.

**Why it exists:** separates chat history from the AI logic so messages persist even if the Agent Service is down.

**Main responsibilities:**

- Create a conversation (`title` defaults to `New Chat`).
- List all conversations for a user (newest first).
- Get a single conversation.
- Update a conversation title.
- Save a message (user or assistant) with optional file URLs (`pdfUrl`, `pptUrl`, `imageUrl`) and the agent that produced it.
- Get all messages of a conversation.

**Important API:** `GET /create-conversation`, `GET /get-conversations`, `GET /get-conversation/:id`, `POST /update-conversations`, `POST /save-message`, `GET /get-messages/:conversationId`.

**Communication:** receives the user ID via the `x-user-id` header added by the gateway; the Agent Service calls it directly to save messages and titles.

## The Agent Service (port 8003)

**What it does:** runs the AI agents — the core "brain" of CortexAI.

**Why it exists:** isolates all AI logic (LLM calls, file generation, agent routing) into one scalable service.

**Main responsibilities:**

- Accept a `{ prompt, conversationId, agent }` request (regular or SSE-streamed).
- Route the prompt to the right agent via a **LangGraph** state machine.
- Run agents that use **Groq** (chat/coding/search/pdf/ppt), **Google Gemini** (image generation), and **Tavily** (web search).
- Generate **PDF** (PDFKit) and **PPT** (PptxGenJS) files and upload them to **Cloudinary**; upload generated **images** to Cloudinary too.
- Deduct a credit for each request by calling the **Payment Service**.
- Save user/assistant messages and auto-generate conversation titles via the **Chat Service**.

**Important API:** `POST /chat`, `POST /chat/stream`.

**Communication:** Agent → Payment (deduct credits), Agent → Chat (save messages/titles), Agent → Cloudinary / Groq / Gemini / Tavily (external).

## The Payment Service (port 8004)

**What it does:** manages credits and payments.

**Why it exists:** a dedicated billing service keeps money logic (credits, plans, transactions, webhooks) separate from everything else.

**Main responsibilities:**

- Give each user a credit balance (`UserCredits`), defaulting to the **free** plan (20 credits).
- Deduct credits per request based on agent type: message = 1, image = 3, pdf = 5, ppt = 5.
- List subscription plans and allow plan changes.
- Create **Razorpay orders**, verify payment signatures, and apply the purchased plan/credits.
- Receive the **Razorpay webhook** for server-side payment confirmation.
- Record a **Transaction** history for every credit change.
- Serve credit info to the gateway (`/api/me`) and initialize users (called by Auth).

**Important API:** `GET /plans`, `GET /credits`, `GET /transactions`, `POST /credits/deduct`, `POST /credits/init`, `POST /order/create`, `POST /order/verify`, `POST /api/payment/webhook`.

**Communication:** called by Auth (init), Gateway (credits), and Agent (deduct); talks to **Razorpay**.

## Shared Code (`backend/shared/`)

- `redis/redis.js` — one Redis connection used by the gateway (session checks, rate limiting) and the auth service (sessions).
- `rateLimiter.js` — Redis-based rate limiter applied by the gateway to `/api/agent` (30 requests/minute/user).
- `creditMiddleware.js` — `creditGuard` / `deductCredits` helpers; defined but currently not imported by any service.