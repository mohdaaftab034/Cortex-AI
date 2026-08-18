# Project Structure

This page explains the complete folder layout of the repository.

```text
Cortex-AI/
│
├── frontend/                     # React + Vite single-page application
│   ├── public/                   # Static assets (favicon.svg, icons.svg)
│   ├── src/
│   │   ├── assets/               # Images used in the UI
│   │   ├── components/           # React components (sidebar, chat, viewers, ...)
│   │   ├── features/             # API calls to the backend (one file per call)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/                # Page-level components (Home)
│   │   ├── redux/                # Redux store and slices (state management)
│   │   ├── utils/                # Frontend helpers (artifact parser, documents)
│   │   ├── App.jsx               # Root component (loads current user)
│   │   ├── index.css             # Global styles
│   │   └── main.jsx              # Entry point (renders the app)
│   ├── utils/                    # Shared frontend utilities (axios, firebase)
│   ├── index.html                # HTML entry point
│   ├── vite.config.js            # Vite configuration
│   ├── eslint.config.js          # ESLint configuration
│   ├── package.json              # Frontend dependencies and scripts
│   └── .env                      # Frontend environment variables
│
├── backend/                      # Node.js microservices backend
│   ├── gateway/                  # API Gateway (port 8000)
│   │   ├── controller/           # Gateway-level controllers (e.g. /api/me)
│   │   ├── middleware/           # Session authentication middleware
│   │   ├── utils/                # Proxy helpers
│   │   ├── index.js              # Express app + routing to services
│   │   ├── Dockerfile            # Container definition
│   │   └── .env                  # Gateway environment variables
│   │
│   ├── services/
│   │   ├── auth/                 # Auth Service (port 8001)
│   │   │   ├── config/           # MongoDB + Firebase Admin setup
│   │   │   ├── controllers/      # Login/logout logic
│   │   │   ├── models/           # User model
│   │   │   ├── routes/           # /login and /logout routes
│   │   │   ├── index.js          # Express app
│   │   │   ├── serviceAccountKey.json  # Firebase Admin service account
│   │   │   ├── Dockerfile
│   │   │   └── .env
│   │   │
│   │   ├── chat/                 # Chat Service (port 8002)
│   │   │   ├── config/           # MongoDB setup
│   │   │   ├── controllers/      # Conversation/message logic
│   │   │   ├── models/           # Conversation + Message models
│   │   │   ├── routes/           # Chat routes
│   │   │   ├── index.js
│   │   │   ├── Dockerfile
│   │   │   └── .env
│   │   │
│   │   ├── agent/                # Agent Service (port 8003)
│   │   │   ├── agents/           # The AI agents (chat, coding, search, pdf, ppt, vision, common)
│   │   │   ├── config/           # MongoDB setup + LLM model setup
│   │   │   ├── controllers/      # /chat and /chat/stream logic
│   │   │   ├── graph/            # LangGraph state machine (routing between agents)
│   │   │   ├── routes/           # Agent routes
│   │   │   ├── utils/            # PDF and PPT generators
│   │   │   ├── index.js
│   │   │   ├── Dockerfile
│   │   │   └── .env
│   │   │
│   │   └── payment/              # Payment Service (port 8004)
│   │       ├── config/           # MongoDB setup
│   │       ├── controllers/      # Credits, plans, orders, webhook logic
│   │       ├── models/           # UserCredits, Transaction, Order models
│   │       ├── routes/           # Payment routes
│   │       ├── utils/            # Plans and credit cost definitions
│   │       ├── index.js
│   │       ├── Dockerfile
│   │       └── .env
│   │
│   ├── shared/                   # Code shared between backend components
│   │   ├── redis/                # Redis client (used by gateway + auth)
│   │   ├── rateLimiter.js        # Redis-based rate limiter (used by gateway)
│   │   └── creditMiddleware.js   # Credit guard helpers (currently not wired into any service)
│   │
│   ├── docker-compose.yml        # Starts Redis for local development
│   └── package.json              # Root backend package (minimal, no scripts of note)
│
└── README.md                     # Project entry point (this documentation)
```

## What the Frontend Contains

- **`src/components/`** — the UI: `Sidebar` (conversation list + user), `ChatArea` (chat layout), `ChatInput` (message box + agent selector), `MessageList`, `MessageBubble` (renders markdown, code, PDF/PPT/image buttons), `Nav`, and the viewer panels: `Artifact` (code viewer), `PdfPanel`, `PptPanel`, `ImagePanel`, and `PlansModal` (pricing).
- **`src/features/`** — small functions that call the API Gateway (login, conversations, messages, send/stream messages, plans, payment orders, logout).
- **`src/redux/`** — Redux Toolkit slices: `user`, `conversation`, `message`, `artifact`, `pdf`, `ppt`, `image`. `store.js` combines them.
- **`src/utils/`** — `artifactParser.js` (extracts code files from AI responses) and `getDocuments.js` (collects generated PDF/PPT/code documents from messages).
- **`utils/`** (top level of frontend) — `axios.js` (HTTP client configured with the gateway URL + cookies) and `firebase.js` (Firebase Auth + Google provider).

## What the Backend Contains

- **API Gateway (`backend/gateway/`)** — the only entry point the frontend talks to. It checks the session cookie against Redis and forwards `/api/auth`, `/api/chat`, `/api/agent`, `/api/payment` requests to the right service. It also serves `GET /api/me` (current user + credits).
- **Auth Service (`backend/services/auth/`)** — verifies Google ID tokens with Firebase Admin, creates the user in MongoDB, stores a session in Redis, and sets the `session` cookie. Also notifies the Payment Service to initialize the user's credits.
- **Chat Service (`backend/services/chat/`)** — stores conversations and messages in MongoDB. It identifies users by the `x-user-id` header added by the gateway.
- **Agent Service (`backend/services/agent/`)** — runs the AI agents. It receives a prompt, routes it to the right agent through a LangGraph state machine, deducts credits (calls Payment Service), saves messages (calls Chat Service), and generates PDFs/PPTs/images uploaded to Cloudinary.
- **Payment Service (`backend/services/payment/`)** — manages user credits, subscription plans, Razorpay orders, and transaction history. Also receives the Razorpay webhook.

## What the Shared Folder Contains

- `shared/redis/redis.js` — a single Redis connection used for sessions (gateway + auth) and rate limiting.
- `shared/rateLimiter.js` — a rate limiter that the gateway applies to `/api/agent` requests (30 requests per minute per user).
- `shared/creditMiddleware.js` — helper functions for deducting credits; defined but currently **not** imported by any service.

## Important Root-Level Files

| File | Purpose |
| ---- | ------- |
| `backend/docker-compose.yml` | Starts the Redis container |
| `frontend/package.json` | Frontend dependencies and scripts (`dev`, `build`, `lint`, `preview`) |
| `README.md` | Project overview and links to this documentation |

Each service and the gateway also have a `Dockerfile` and a `.dockerignore`. There is no CI/CD configuration in the repository.