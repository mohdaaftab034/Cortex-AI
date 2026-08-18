# Backend

This page is a high-level overview of the backend. Detailed per-service documentation lives in [services.md](./services.md).

## Technology

| Area | Choice |
| ---- | ------ |
| Runtime | Node.js (ES Modules, `"type": "module"`) |
| Framework | Express 5 |
| Proxy | `express-http-proxy` (API Gateway) |
| Database | MongoDB via Mongoose |
| Cache / sessions | Redis via `ioredis` |
| AI | LangChain + LangGraph (`@langchain/...`), Groq, Google Gemini, Together AI |
| Documents | PDFKit, PptxGenJS |
| Storage | Cloudinary |
| Payments | Razorpay |
| Auth | Firebase Admin SDK |

## Microservices Architecture

The backend is split into **four microservices** plus an **API Gateway**:

```text
backend/
├── gateway/   → API Gateway (port 8000)
└── services/
    ├── auth/      → Auth Service (8001)
    ├── chat/      → Chat Service (8002)
    ├── agent/     → Agent Service (8003)
    └── payment/   → Payment Service (8004)
```

Every component:

- has its **own `package.json`** and dependencies,
- reads its **own `.env`** file,
- connects to its **own MongoDB database** (except the gateway, which uses Redis for sessions),
- runs as its **own process** (`npm run dev` or `npm start`).

## API Gateway

- Single entry point for the frontend on port 8000.
- Uses `express-http-proxy` to forward requests by URL prefix:

| URL prefix | Target |
| ---------- | ------ |
| `/api/auth` | Auth Service |
| `/api/chat` | Chat Service |
| `/api/agent` | Agent Service |
| `/api/payment` | Payment Service |
| `/api/me` | handled by the gateway itself |

- Runs the `protect` middleware on protected routes. It reads the `session` cookie, looks it up in Redis, and rejects requests without a valid session.
- Adds an `x-user-id` header so services know the authenticated user.

See [api-gateway.md](./api-gateway.md).

## Individual Services

| Service | Responsibilities |
| ------- | ---------------- |
| **Auth** | Verify Google ID token (Firebase Admin), create/find user, create Redis session, set cookie, notify Payment Service to init credits, logout. |
| **Chat** | Create/list/update conversations, save and list messages. |
| **Agent** | Route prompts to the correct AI agent, stream responses, generate PDF/PPT/image files (Cloudinary), deduct credits, save messages and titles. |
| **Payment** | Manage credits and plans, create/verify Razorpay orders, handle the Razorpay webhook, record transaction history. |

## Databases

Each service connects to its own MongoDB database:

| Service | Database |
| ------- | -------- |
| Auth | `.../auth` |
| Chat | `.../chat` |
| Agent | `.../agent` |
| Payment | `.../payment` |

Redis is shared and stores sessions and rate-limit counters. See [database.md](./database.md).

## Authentication

- Users authenticate with **Google** through Firebase (the frontend does this).
- The Auth Service verifies the Firebase ID token, then creates a session in **Redis** and sets an **HttpOnly cookie** named `session`.
- The gateway checks this cookie on every protected request.
- No JWT is stored in the browser; there is no password login.

See [authentication.md](./authentication.md).

## Middleware

- `gateway/middleware/auth.middleware.js` — `protect`: validates the session cookie against Redis and attaches `req.user`.
- `shared/rateLimiter.js` — `rateLimiter`: Redis-based, applied to `/api/agent` (30 requests / minute / user).
- `shared/creditMiddleware.js` — `creditGuard`/`deductCredits` helpers (defined but **not** currently wired into any service).

## Controllers, Services, Models

This project uses a **controller → model** pattern (there are no separate service classes):

- **Routes** (`routes/*.js`) define the endpoints and point to controller functions.
- **Controllers** (`controllers/*.js`) contain the request logic (validation, database calls, external API calls, responses).
- **Models** (`models/*.js`) are Mongoose schemas.

There are no classes/repositories — just Express route handlers.

## Communication Between Services

Services call each other **directly over HTTP** (REST):

```text
Auth      ──POST /api/payment/credits/init──► Payment   (init credits on first login)
Gateway   ──GET  /api/payment/credits────────► Payment   (fetch credits for /api/me)
Agent     ──POST /api/payment/credits/deduct─► Payment   (spend a credit per request)
Agent     ──POST /save-message───────────────► Chat      (save user/assistant messages)
Agent     ──GET  /get-conversation/:id───────► Chat      (check conversation title)
Agent     ──POST /update-conversations───────► Chat      (set auto-generated title)
Gateway   ──Redis lookup────────────────────► Redis     (session check, rate limit)
```

There is **no message broker**. See [service-communication.md](./service-communication.md).

## Error Handling

- Controllers wrap logic in `try/catch` and return JSON error messages with appropriate status codes (`400`, `403`, `429`, `500`).
- Service-to-service calls use `axios` with short timeouts (5000 ms) and log failures instead of crashing (e.g. saving a message or initing credits failing does not break the request).
- The rate limiter falls back to `next()` on Redis errors so it never blocks traffic unintentionally.
- The streaming endpoint (`/chat/stream`) writes an error object into the SSE stream instead of ending the connection abruptly.

## Configuration

Each component loads configuration from its own `.env` file using `dotenv`:

- Ports, service URLs, MongoDB connection strings, Redis URL, and all external API keys.
- The gateway needs the URLs of all four services (`AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `PAYMENT_SERVICE`) and `FRONTEND_URL` for CORS.

See [environment-variables.md](./environment-variables.md).