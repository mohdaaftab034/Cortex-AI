# Deployment

This repository contains **no deployment configuration** (no CI/CD files, no platform configs, no production Compose file). This page explains the deployment **requirements** based on the actual code, and gives practical guidance for each part. No real secrets are included.

## Overview

The system has five deployable backend components plus one static frontend, and depends on several managed external services:

| Part | Runs as | Needs |
| ---- | ------- | ----- |
| Frontend | Static files (Vite build) | `VITE_SERVER_URL` (public gateway URL), Firebase web config |
| API Gateway | Node process / container (port 8000) | URLs of all 4 services, Redis, CORS origin |
| Auth Service | Node process / container (port 8001) | MongoDB `auth`, Redis, Firebase Admin key, Payment URL |
| Chat Service | Node process / container (port 8002) | MongoDB `chat` |
| Agent Service | Node process / container (port 8003) | MongoDB `agent`, Groq, Gemini, Tavily, Cloudinary, Chat + Payment URLs |
| Payment Service | Node process / container (port 8004) | MongoDB `payment`, Razorpay keys |
| Redis | Managed Redis or container | — |
| MongoDB | Managed (e.g. Atlas) | One database per service |

## Frontend

The frontend is a **static Vite app**. Build it and host the `dist/` output on any static host (Vercel, Netlify, Cloudflare Pages, S3/CloudFront, nginx).

```bash
cd frontend
npm install
npm run build     # outputs to frontend/dist/
```

Production environment variables for the frontend build:

```env
VITE_SERVER_URL=https://api.yourdomain.com
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
```

**CORS requirement:** the gateway's `FRONTEND_URL` must be set to the deployed frontend origin (e.g. `https://yourdomain.com`) or browser requests will be blocked.

## Backend

### Each service as a process

The services are standard Express apps. Run them with Node.js:

```bash
cd backend/services/<service>
npm install
npm start
```

Each service reads its own `.env` (or environment variables) and needs the variables listed in [environment-variables.md](./environment-variables.md).

### Each service as a container

Every component has a `Dockerfile`. Build with the **`backend/` directory as the context**:

```bash
# from backend/
docker build -f gateway/Dockerfile -t cortexai-gateway .
docker build -f services/auth/Dockerfile -t cortexai-auth .
docker build -f services/chat/Dockerfile -t cortexai-chat .
docker build -f services/agent/Dockerfile -t cortexai-agent .
docker build -f services/payment/Dockerfile -t cortexai-payment .
```

Pass environment variables at runtime (`--env-file` or your platform's env config). See [docker.md](./docker.md).

## API Gateway

Deploy it like any other service. In production:

- `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `PAYMENT_SERVICE` must point to the **internal URLs** of the deployed services (not `localhost`). If the services run in the same network (Docker network, Kubernetes cluster, same VM), use the network hostnames.
- `FRONTEND_URL` must be the **public** frontend origin.
- `REDIS_URL` must point to a reachable Redis instance.
- Consider setting a reverse proxy (nginx) in front of it for TLS — the `session` cookie is currently `secure: false`, so over HTTPS you should set it to `secure: true` (or configure your proxy accordingly).

## Databases

### MongoDB

Use a managed MongoDB (e.g. Atlas) or self-hosted MongoDB. Create **four databases** (or four connection strings) — one per service:

- `auth`, `chat`, `agent`, `payment`

The database name comes from the `MONGODB_URI` path. Set the appropriate URI in each service's environment. There are **no migrations** — collections are created automatically by Mongoose on first use.

### Redis

Use a managed Redis or run a Redis container/instance. It must be reachable from the **gateway** (session checks, rate limiting) and the **auth service** (session writes). Set `REDIS_URL` in both.

## External Services (all must be provisioned in production)

| Service | Used by | What to set up |
| ------- | ------- | -------------- |
| Firebase | Frontend + Auth | Google Sign-In enabled; Firebase Admin service account (`serviceAccountKey.json`) mounted next to the Auth Service |
| Groq | Agent | API key (`GROQ_API_KEY`) |
| Google Gemini | Agent | API key (`GOOGLE_API_KEY`) |
| Together AI | Agent | API key (`TOGETHER_API_KEY`) — optional |
| Tavily | Agent | API key (`TAVILY_API_KEY`) |
| Cloudinary | Agent | Cloud name + API key/secret |
| Razorpay | Payment | Key ID, key secret, and a webhook secret; register the webhook URL `https://<payment-host>/api/payment/webhook` |

## Environment Variables (production)

Set the same variables as development but with production values. Do **not** commit them. Use your platform's secret manager (e.g. `.env` on the host, Docker secrets, or a CI secret store).

Reference list: [environment-variables.md](./environment-variables.md).

## Deployment Notes / Known Gaps

- The `.env` files currently in the repo contain **real secrets** — remove/rotate them before going live.
- The `session` cookie uses `secure: false` — for HTTPS you must set it to `secure: true` in `auth.controller.js`.
- The agent/payment Docker images install dependencies inside the image and use the unpinned `node` tag; consider pinning versions and using multi-stage builds for production.
- There is no health-check endpoint for orchestrators (only the plain text `/` routes), and no reverse-proxy/TLS configuration included.
- Rate limiting (30 req/min on `/api/agent`) applies in production as configured in `shared/rateLimiter.js`.