# Docker

Docker is used in two ways in this project:

1. **Docker Compose** — runs Redis locally for development.
2. **Dockerfiles** — one per backend component, so each service can run in a container.

There is **no container for the frontend** (it is a static Vite app).

## Docker Compose

The only Compose file is `backend/docker-compose.yml`:

```yaml
services:
  redis:
    image: redis
    ports:
      - "6379:6379"
```

It starts a single **Redis** container on port 6379. This is the infrastructure needed for sessions and rate limiting.

### Commands

```bash
# From backend/
cd backend

# Start Redis in the background
docker compose up -d

# Start Redis in the foreground (logs visible)
docker compose up

# Stop and remove the container
docker compose down
```

## Dockerfiles

Every backend component has a `Dockerfile`. They are structured the same way, with small differences:

| Component | File | Exposed port | Notes |
| --------- | ---- | ------------ | ----- |
| Gateway | `backend/gateway/Dockerfile` | 8000 | |
| Auth | `backend/services/auth/Dockerfile` | 8001 | |
| Chat | `backend/services/chat/Dockerfile` | 8002 | |
| Agent | `backend/services/agent/Dockerfile` | 8003 | Uses `npm install --legacy-peer-deps` |
| Payment | `backend/services/payment/Dockerfile` | 8004 | |

Example (`backend/services/chat/Dockerfile`):

```dockerfile
FROM node

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./services/chat/package*.json ./services/chat/
RUN cd services/chat && npm install

COPY services/chat ./services/chat
COPY shared ./shared

WORKDIR /app/services/chat

EXPOSE 8002

CMD ["npm", "start"]
```

Key points:

- The image is built from the **`backend/` directory as the build context** (the paths like `services/chat` and `shared` only resolve when the context is `backend/`).
- `node_modules` and `.env` are excluded via each component's `.dockerignore` (which lists `node_modules`, `.env`, and `Dockerfile`).
- The `shared/` folder is copied in because the gateway and auth import `shared/redis/redis.js` and `shared/rateLimiter.js`.
- The image runs `npm start` (plain `node`, not `nodemon`).
- No environment variables are baked into the images — they must be supplied at runtime.

## Build Command

Because the Dockerfiles use the `backend/` folder as the context, build each image like this (example for the gateway):

```bash
# From backend/
docker build -f gateway/Dockerfile -t cortexai-gateway .
```

## Container Diagram

```text
┌──────────────┐
│   Redis      │  image: redis, port 6379 (docker-compose)
└──────────────┘
        ▲
        │ sessions / rate limits
        │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Gateway    │     │     Auth     │     │     Chat     │     │   Payment    │
│   :8000      │     │   :8001      │     │   :8002      │     │   :8004      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
┌──────────────┐
│    Agent     │   :8003  (Groq, Gemini, Tavily, Cloudinary)
└──────────────┘
```

Each container needs to reach the others and the external services. When running locally, the services use `http://localhost:<port>` URLs from their `.env` files. Inside a Docker network you would change those to the container names.

## Networks and Volumes

- **Networks:** none are defined in the Compose file or the Dockerfiles — services share the default network or the host network depending on how you run them.
- **Volumes:** none are defined. MongoDB runs externally (Atlas), and generated files are stored in Cloudinary, not on disk.

## Environment Variables in Docker

- `.env` files are intentionally excluded from the images (`.dockerignore`).
- You must pass environment variables when running a container, e.g.:

```bash
docker run --rm -p 8001:8001 \
  -e PORT=8001 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e REDIS_URL="redis://..." \
  -e PAYMENT_SERVICE="http://host.docker.internal:8004" \
  cortexai-auth
```

or via an env file:

```bash
docker run --rm -p 8001:8001 --env-file ./services/auth/.env cortexai-auth
```

## Notes and Caveats

- The images use the `node` tag (no pinned version), so builds are not reproducible.
- `npm install` runs inside the images (no build cache or multi-stage optimization).
- The Agent Service installs with `--legacy-peer-deps` due to its dependency tree.
- Running the full system in Docker requires either a custom Compose file that links the services (not provided in the repo) or per-container URLs pointing at the host/network.