# Environment Variables

Every part of the project is configured with environment variables, loaded from `.env` files using `dotenv` (backend) or Vite (frontend).

> **Important:** the repository currently contains committed `.env` files with **real secrets** (Firebase, Groq, Razorpay, Cloudinary, etc.). Do **not** reuse those publicly. Create your own values and never commit them. Only variable **names** are documented here.

## Where Each `.env` File Lives

| Component | File |
| --------- | ---- |
| Frontend | `frontend/.env` |
| API Gateway | `backend/gateway/.env` |
| Auth Service | `backend/services/auth/.env` |
| Chat Service | `backend/services/chat/.env` |
| Agent Service | `backend/services/agent/.env` |
| Payment Service | `backend/services/payment/.env` |

The shared folder (`backend/shared/`) has no `.env` of its own — the code that uses it (gateway, auth) loads the variables from their own `.env`.

---

## Frontend

| Variable | Purpose | Required |
| -------- | ------- | -------- |
| `VITE_SERVER_URL` | Base URL of the API Gateway (e.g. `http://localhost:8000`). Used by `utils/axios.js` and `streamMessage.js`. | Yes |
| `VITE_FIREBASE_API_KEY` | Firebase web API key for Google sign-in (`utils/firebase.js`). | Yes |

Both are read via `import.meta.env.VITE_...`, so they must be prefixed with `VITE_`.

---

## API Gateway

| Variable | Purpose | Required | Used in |
| -------- | ------- | -------- | ------- |
| `PORT` | Port the gateway listens on (8000). | Yes | `index.js` |
| `AUTH_SERVICE` | Auth Service URL, e.g. `http://localhost:8001`. | Yes | `index.js` (proxy target) |
| `CHAT_SERVICE` | Chat Service URL, e.g. `http://localhost:8002`. | Yes | `index.js` (proxy target) |
| `AGENT_SERVICE` | Agent Service URL, e.g. `http://localhost:8003`. | Yes | `index.js` (proxy target) |
| `PAYMENT_SERVICE` | Payment Service URL, e.g. `http://localhost:8004`. | Yes | `index.js` (proxy), `user.controller.js` |
| `FRONTEND_URL` | Allowed CORS origin, e.g. `http://localhost:5173`. | Yes | `index.js` (`cors`) |
| `REDIS_URL` | Redis connection string, e.g. `redis://localhost:6379`. | Yes | `shared/redis/redis.js` (via `protect`, rate limiter) |
| `MONGODB_URI` | Present in the `.env` file but **not referenced by the gateway code**. | No | — |

---

## Auth Service

| Variable | Purpose | Required |
| -------- | ------- | -------- |
| `PORT` | Port the service listens on (8001). | Yes |
| `MONGODB_URI` | MongoDB connection string for the `auth` database. | Yes |
| `PAYMENT_SERVICE` | Payment Service URL (`http://localhost:8004`) used for `POST /api/payment/credits/init`. | Yes |
| `REDIS_URL` | Redis connection string for sessions. | Yes |

The Auth Service also needs the Firebase Admin service account file at `backend/services/auth/serviceAccountKey.json` (referenced by `config/firebase.js`). It is not an environment variable, but it is required for the service to start.

---

## Chat Service

| Variable | Purpose | Required |
| -------- | ------- | -------- |
| `PORT` | Port the service listens on (8002). | Yes |
| `MONGODB_URI` | MongoDB connection string for the `chat` database. | Yes |

---

## Agent Service

| Variable | Purpose | Required |
| -------- | ------- | -------- |
| `PORT` | Port the service listens on (8003). | Yes |
| `MONGODB_URI` | MongoDB connection string for the `agent` database. | Yes |
| `GROQ_API_KEY` | API key for the default LLM (Groq, `llama-3.3-70b-versatile`). Used by chat/coding/search/pdf/ppt agents. | Yes (chat won't work without it) |
| `GOOGLE_API_KEY` | Google API key for Gemini image generation (`vision` agent). | For vision agent |
| `TOGETHER_API_KEY` | Together AI API key (`mistralai/Mixtral-8x7B-Instruct-v0.1`). The model is defined but **not the default**. | No |
| `TAVILY_API_KEY` | Tavily API key for web search (`search` agent). If missing/placeholder, search falls back to model knowledge. | For search agent |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for PDF/PPT/image uploads. | For pdf/ppt/vision agents |
| `CLOUDINARY_API_KEY` | Cloudinary API key. | For pdf/ppt/vision agents |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret. | For pdf/ppt/vision agents |
| `CHAT_SERVICE_URL` | Chat Service URL (`http://localhost:8002`) used for `/save-message`, `/get-conversation/:id`, `/update-conversations`. | Yes |
| `PAYMENT_SERVICE_URL` | Payment Service URL (`http://localhost:8004`) used for `/api/payment/credits/deduct`. | Yes |

---

## Payment Service

| Variable | Purpose | Required |
| -------- | ------- | -------- |
| `PORT` | Port the service listens on (8004). | Yes |
| `MONGODB_URI` | MongoDB connection string for the `payment` database. | Yes |
| `RAZORPAY_KEY_ID` | Razorpay key ID — used to create orders and returned to the frontend for checkout. | For payments |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret — used to verify payment signatures. | For payments |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to verify Razorpay webhook signatures. If empty, webhook signature verification is skipped. | Optional |
| `REDIS_URL` | Present in the `.env` file but the payment service code does **not** use Redis directly (it is there for consistency). | No |

---

## Shared Code

| Variable | Used by | Purpose |
| -------- | ------- | ------- |
| `REDIS_URL` | `backend/shared/redis/redis.js` | Redis connection (loaded from whichever service imports it). |
| `PAYMENT_SERVICE` | `backend/shared/creditMiddleware.js` | Default payment service URL (fallback `http://localhost:8004`). Note: `creditMiddleware.js` is currently **not imported by any service**. |

---

## Docker

The `docker-compose.yml` only starts Redis (`image: redis`, port 6379). No environment variables are set there — Redis runs with defaults. The service `Dockerfiles` do not bake in `.env` values; `.env` files are excluded by `.dockerignore`. When running in Docker you must pass environment variables separately (e.g. `docker run --env-file` or your orchestration platform).

See [docker.md](./docker.md) for details.