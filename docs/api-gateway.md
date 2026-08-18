# API Gateway

The API Gateway is the **single entry point** for the frontend. It runs on port **8000** and lives in `backend/gateway/`.

## Why the Gateway Exists

- The frontend only needs to know **one URL** instead of four service URLs.
- **Authentication** is centralized: the `protect` middleware checks the session cookie in Redis for every protected route.
- **Routing** is centralized: each URL prefix is forwarded to the correct service.
- It can add context that services need (the `x-user-id` header) without the frontend knowing about it.

## Request Flow

```text
Frontend (React)
   ↓  HTTP request with session cookie
API Gateway (port 8000)
   ↓  protect middleware: session in Redis?
   ↓  (for /api/agent) rate limiter
API Gateway forwards to the correct microservice
   ↓
Database / external service
```

## Routes and Forwarding

Defined in `backend/gateway/index.js`:

| URL prefix | Middleware | Forwards to | Notes |
| ---------- | ---------- | ----------- | ----- |
| `POST/GET /api/auth/*` | none | `AUTH_SERVICE` (8001) | Login/logout — no session required |
| `/api/chat/*` | `protect` | `CHAT_SERVICE` (8002) | Adds `x-user-id` header |
| `/api/agent/*` | `protect`, `rateLimiter()` | `AGENT_SERVICE` (8003) | Rate-limited (30 req/min) |
| `/api/payment/*` | `protect` | `PAYMENT_SERVICE` (8004) | Adds `x-user-id` header |
| `GET /api/me` | `protect` | handled by the gateway | Returns user + credits |
| `GET /` | none | — | Health check text |

The gateway uses the `express-http-proxy` library. For `/api/chat` and `/api/payment` it uses a custom `proxyWithHeader` wrapper (`gateway/utils/proxyWithHeader.js`) that adds `x-user-id` from the authenticated user. For `/api/agent` it uses a plain proxy (the Agent Service reads the user ID from the `x-user-id` header if present, and the request body otherwise).

## Authentication Handling

`protect` (`gateway/middleware/auth.middleware.js`):

1. Reads the `session` cookie from the request.
2. If there is no cookie → `400 Unauthorized`.
3. Looks up `session-<sessionId>` in **Redis**.
4. If the session is missing/expired → `400 Session Expired`.
5. Parses the session JSON into `req.user` and calls `next()`.

`req.user` looks like:

```json
{
  "userId": "...",
  "name": "...",
  "email": "...",
  "avatar": "..."
}
```

## Rate Limiting

`shared/rateLimiter.js` is applied to `/api/agent`:

- Window: **60 seconds**
- Limit: **30 requests per user** (falls back to IP/anonymous)
- Uses Redis counters (`ratelimit:<userId>:<window>`)
- Sends `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers
- Returns `429 Too many requests` when exceeded

## `/api/me` (Current User)

The gateway handles this route itself in `gateway/controller/user.controller.js`:

- Returns the `req.user` data from the session.
- If the user has a `userId`, it calls `GET /api/payment/credits` on the **Payment Service** (with the `x-user-id` header) and attaches the result as `credits` (plan, credits remaining, etc.).
- If the credits call fails, it logs the error and still returns the user data (credits = `null`).

## Middleware Summary

| Middleware | Location | Purpose |
| ---------- | -------- | ------- |
| `cors` | `index.js` | Allows the frontend origin (`FRONTEND_URL`) with credentials |
| `cookieParser` | `index.js` | Parses the `session` cookie |
| `morgan("dev")` | `index.js` | Request logging |
| `protect` | `middleware/auth.middleware.js` | Session check |
| `rateLimiter` | `shared/rateLimiter.js` | Rate limit for `/api/agent` |
| `proxyWithHeader` | `utils/proxyWithHeader.js` | Proxies and injects `x-user-id` |

## Port and Configuration

The gateway reads these from its `.env`:

| Variable | Purpose |
| -------- | ------- |
| `PORT` | Port (8000) |
| `AUTH_SERVICE` | Auth Service URL |
| `CHAT_SERVICE` | Chat Service URL |
| `AGENT_SERVICE` | Agent Service URL |
| `PAYMENT_SERVICE` | Payment Service URL |
| `FRONTEND_URL` | Allowed CORS origin |
| `REDIS_URL` | Redis connection string |

## Service Discovery

There is **no service discovery**. Service URLs are hard-coded through environment variables in the gateway's `.env` file. To move a service, update the matching variable.

## Error Handling

- If `protect` finds no cookie or no session, it responds `400` with a message.
- Unexpected errors inside middleware return `500`.
- Downstream service errors are returned as-is by the proxy (status codes from the service).