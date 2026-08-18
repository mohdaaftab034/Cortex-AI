# Troubleshooting

Common problems you may hit when running CortexAI locally, with practical fixes.

---

## Missing Environment Variables

### Problem
A service starts but fails at runtime — for example the gateway logs `AUTH_SERVICE is not defined`, or a request fails because a service URL is undefined.

### Cause
The `.env` file is missing in that folder, or a variable name is wrong. Each component reads its **own** `.env` file (frontend, gateway, and each service).

### Solution
Create the `.env` files listed in [setup.md](./setup.md) and [environment-variables.md](./environment-variables.md), restart the service, and double-check the variable names match exactly.

---

## Database Connection Errors

### Problem
A service logs `Error connecting to MongoDB:` on startup.

### Cause
`MONGODB_URI` is missing, wrong, or the MongoDB instance is unreachable. The services use MongoDB Atlas connection strings in development.

### Solution
- Check the `MONGODB_URI` in the service's `.env`.
- Make sure the MongoDB user/password and cluster name are correct.
- If you use Atlas with IP allow-listing, add your current IP.
- Confirm the database name in the URI matches the service (`auth`, `chat`, `agent`, `payment`).

---

## Redis Connection Errors

### Problem
The gateway or auth service logs `Error: connect ECONNREFUSED 127.0.0.1:6379`, or login fails with a session error.

### Cause
Redis is not running. `REDIS_URL` points at `redis://localhost:6379` but the Redis container is down.

### Solution
```bash
cd backend
docker compose up -d
docker compose ps   # redis should be running
```
Then restart the gateway and auth service.

---

## Service Not Running

### Problem
The frontend shows errors, or a request to the gateway returns a proxy error / 502.

### Cause
The target service is not started. For example, `/api/agent/chat` fails if the Agent Service (8003) is down.

### Solution
Start all services (each in its own terminal) and confirm each prints its "started" message:

```bash
cd backend/gateway && npm run dev
cd backend/services/auth && npm run dev
cd backend/services/chat && npm run dev
cd backend/services/agent && npm run dev
cd backend/services/payment && npm run dev
```

Check each health route (`http://localhost:8000` ... `:8004`) as described in [setup.md](./setup.md).

---

## Port Conflicts

### Problem
A service prints something like `Error: listen EADDRINUSE: address already in use :::8000`, or it starts but requests behave strangely.

### Cause
Another process is already using the port.

### Solution
Find and stop the process, or change `PORT` in the `.env` of that component:

```powershell
# PowerShell
Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

If you change a service port, also update the URLs in the gateway's `.env`.

---

## API Gateway Cannot Reach a Service

### Problem
Gateway logs a proxy error, or the frontend gets `500`/`502` on `/api/chat`, `/api/agent`, or `/api/payment`.

### Cause
The service URLs in the gateway `.env` (`CHAT_SERVICE`, `AGENT_SERVICE`, `PAYMENT_SERVICE`, `AUTH_SERVICE`) point to a port/address where nothing is listening.

### Solution
Verify the URLs match where the services actually run, then restart the gateway so it picks up the new `.env`.

---

## Login / Session Problems

### Problem
- `GET /api/me` returns `400 Session Expired` or `400 Unauthorized`.
- The login overlay never disappears.
- The frontend is logged out after a page refresh.

### Cause
- Redis is down (sessions can't be stored/read).
- The session cookie is missing (login request failed).
- The frontend and backend are on different origins and CORS credentials are not configured.

### Solution
- Confirm Redis is running and reachable from the gateway and auth service.
- Log in again (`GET /api/auth/login`).
- Make sure `FRONTEND_URL` in the gateway `.env` matches the frontend origin (e.g. `http://localhost:5173`) and that the frontend axios instance uses `withCredentials: true`.
- If you cleared cookies or Redis data, simply log in again.

---

## Authentication Errors (Firebase)

### Problem
`POST /api/auth/login` returns an error like `Firebase ID token has incorrect "aud" (audience) claim`, or the Auth Service fails to start.

### Cause
- The Firebase web config (`VITE_FIREBASE_API_KEY` / project in `frontend/utils/firebase.js`) and the Admin service account (`serviceAccountKey.json`) belong to **different** Firebase projects.
- The service account file is missing or expired.

### Solution
- Use the same Firebase project on the frontend and backend.
- Verify `backend/services/auth/serviceAccountKey.json` exists and is the correct project's key.
- Regenerate the service account key if it was revoked.

---

## "Insufficient Credits" / Requests Blocked

### Problem
A chat request returns `403` with `insufficientCredits: true`, even right after logging in.

### Cause
The user's credit account was not created (the Auth → Payment init call failed) or the balance is actually 0. Free plan = 20 credits; a PDF/PPT costs 5, an image 3.

### Solution
- Check that the Payment Service is running when you log in for the first time (the init call has a 5-second timeout and is skipped on failure).
- Verify the credit account exists: `GET /api/payment/credits`.
- If needed, reset credits via `POST /api/payment/credits/reset` (`{ "userId": "..." }`).

---

## Rate Limit (429) Errors

### Problem
Requests to `/api/agent/*` return `429 Too many requests. Please slow down.`

### Cause
The gateway rate limiter allows 30 requests per minute per user.

### Solution
Wait for the minute window to pass. For local testing you can raise the limit in `backend/shared/rateLimiter.js` (`MAX_REQUESTS`), then restart the gateway.

---

## CORS Issues

### Problem
Browser console shows `Access to fetch ... has been blocked by CORS policy`, and API calls fail while the services themselves work.

### Cause
The gateway's `FRONTEND_URL` does not match the origin the frontend is served from, or the request is being sent without credentials.

### Solution
- Set `FRONTEND_URL` to exactly the frontend URL (e.g. `http://localhost:5173`).
- The frontend axios instance uses `withCredentials: true` — don't remove it.
- After changing the gateway `.env`, restart the gateway.

---

## Frontend Cannot Connect to Backend

### Problem
The frontend loads but every API call fails; the network tab shows requests to the wrong URL.

### Cause
`VITE_SERVER_URL` is wrong or missing in `frontend/.env`.

### Solution
Set `VITE_SERVER_URL=http://localhost:8000` (or your gateway URL), then restart the Vite dev server. Vite only exposes variables prefixed with `VITE_`.

---

## PDF / PPT / Image Not Generated or Panel Shows an Error

### Problem
- The PDF/PPT/Image panel shows "Failed to load PDF" / "Presentation unavailable" / "Failed to load image".
- Or the Agent Service logs a Cloudinary or LLM error.

### Cause
- Missing/invalid Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- Missing `GROQ_API_KEY` (the agent generates content through Groq first).
- Missing `GOOGLE_API_KEY` for the vision agent.
- The generated file URL is not publicly accessible.

### Solution
- Check the Agent Service `.env` has valid Cloudinary, Groq, and Google keys.
- Retry the request and watch the Agent Service logs.
- Confirm the Cloudinary upload actually returned a public URL (the agent throws "no URL returned" otherwise).

---

## Search Agent Gives No Live Results

### Problem
The Search agent answers "cannot access live web search results right now".

### Cause
`TAVILY_API_KEY` is missing, invalid, or still the placeholder value. The code treats `"tvly-dev-api-key"` as "no key".

### Solution
Add a valid Tavily API key to the Agent Service `.env` and restart the service.

---

## Docker Issues

### Problem
- `docker compose up` fails to pull the `redis` image (network/proxy).
- A service container exits immediately.
- `docker build` fails with `COPY failed: file not found`.

### Cause
- No internet / Docker not logged in / proxy restrictions.
- The container needs environment variables (`.env` is excluded by `.dockerignore`).
- The Dockerfile was built with the wrong context (the paths like `services/chat` only work when the **build context is `backend/`**).

### Solution
- Check your Docker connection: `docker info`.
- Always build from the `backend/` directory, e.g. `docker build -f services/chat/Dockerfile -t cortexai-chat .`
- Pass env vars at runtime with `--env-file` or `-e` (see [docker.md](./docker.md)).

---

## Agent Service "Chat" Requests Time Out

### Problem
Chat messages hang for a long time or return an error.

### Cause
The Agent Service depends on external LLM calls (Groq). Slow network, an invalid `GROQ_API_KEY`, or hitting Groq rate limits will delay/fail requests. The LLM instances are created at module load with the API keys, so a missing key can also crash agent startup.

### Solution
- Verify `GROQ_API_KEY` is valid and the service has network access.
- Watch the Agent Service terminal for API errors.
- Reduce load (the gateway rate limiter is 30 req/min).

---

## Still Stuck?

- Confirm you are running **Redis** (`docker compose up`) — many symptoms trace back to it.
- Restart the service you changed; `.env` values are read at startup.
- Check each service's terminal for the specific error message, then search this page for the pattern.