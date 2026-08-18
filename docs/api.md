# API Reference

This page documents every HTTP endpoint that actually exists in the codebase.

## How to Read This Page

- **Public API** — endpoints the frontend calls. They go through the **API Gateway** at `http://localhost:8000`.
- **Internal API** — endpoints called directly between services (not exposed to the frontend). They live on the service ports.
- **Auth** means the request must carry a valid `session` cookie. The gateway checks this cookie; services protected behind the gateway trust the `x-user-id` header the gateway adds.

---

# Public API (via API Gateway, port 8000)

## Health Check

### GET /

Purpose: verify the gateway is running.

Response:

```
Gateway Server is running successfully
```

---

## GET /api/me

Purpose: get the current logged-in user (from the session) plus their credits (fetched from the Payment Service).

Authentication: required.

Response:

```json
{
  "userId": "66f...",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://...",
  "credits": {
    "userId": "66f...",
    "plan": "free",
    "credits": 20,
    "totalCredits": 20,
    "usedCredits": 0,
    "lastResetAt": "2026-08-18T00:00:00.000Z"
  }
}
```

Possible errors:
- `400 Unauthorized` — no session cookie.
- `400 Session Expired` — session not found in Redis.
- `500` — unexpected error. (`credits` will be `null` if the credits fetch fails, but the user data is still returned.)

---

## Authentication

### POST /api/auth/login

Purpose: log a user in with a Firebase Google ID token. Creates the user, a Redis session, and the `session` cookie. Forwards to the Auth Service.

Authentication: not required.

Request:

```json
{
  "token": "firebase_id_token"
}
```

Response (the created/found user):

```json
{
  "_id": "66f...",
  "firebaseUid": "abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://...",
  "createdAt": "2026-08-18T00:00:00.000Z",
  "updatedAt": "2026-08-18T00:00:00.000Z"
}
```

The response also sets the `session` cookie (HttpOnly, 7 days).

Possible errors:
- `500` — invalid/expired Firebase token or server error.

### GET /api/auth/logout

Purpose: delete the current session and clear the cookie. Forwards to the Auth Service.

Authentication: not required.

Response:

```json
{ "message": "Logged out successfully" }
```

---

## Chat

All chat endpoints require a session and are forwarded to the Chat Service. The gateway adds `x-user-id` automatically — you don't send it.

### GET /api/chat/create-conversation

Purpose: create a new conversation for the current user.

Authentication: required.

Response (the new conversation):

```json
{
  "_id": "66f...",
  "title": "New Chat",
  "userId": "66f...",
  "createdAt": "2026-08-18T00:00:00.000Z",
  "updatedAt": "2026-08-18T00:00:00.000Z"
}
```

### GET /api/chat/get-conversations

Purpose: list the current user's conversations, newest first.

Authentication: required.

Response:

```json
[
  {
    "_id": "66f...",
    "title": "My chat",
    "userId": "66f...",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### GET /api/chat/get-conversation/:id

Purpose: get a single conversation by its MongoDB `_id`.

Authentication: required.

Response: the conversation object (or `null` if not found).

### POST /api/chat/update-conversations

Purpose: set a conversation title.

Authentication: required.

Request:

```json
{ "id": "66f...", "title": "New title" }
```

Response: the updated conversation.

### POST /api/chat/save-message

Purpose: save a message to a conversation.

Authentication: required.

Request:

```json
{
  "conversationId": "66f...",
  "role": "assistant",
  "content": "Hello!",
  "agent": "chat",
  "pdfUrl": "https://...",
  "pptUrl": "https://...",
  "imageUrl": "https://..."
}
```

`agent`, `pdfUrl`, `pptUrl`, and `imageUrl` are optional.

Response: the saved message.

### GET /api/chat/get-messages/:conversationId

Purpose: list all messages of a conversation.

Authentication: required.

Response:

```json
[
  {
    "_id": "66f...",
    "conversationId": "66f...",
    "role": "user",
    "content": "Hello",
    "agent": null,
    "pdfUrl": null,
    "pptUrl": null,
    "imageUrl": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

## Agent (AI)

Requires a session and is rate-limited by the gateway (30 requests/minute/user).

### POST /api/agent/chat

Purpose: send a prompt to the AI agents. Returns the full response (non-streaming).

Authentication: required.

Request:

```json
{
  "prompt": "Build a calculator",
  "conversationId": "66f...",
  "agent": "auto"
}
```

`agent` is optional (`auto`, `chat`, `coding`, `search`, `pdf`, `ppt`, `vision`; defaults to `auto`).

Response:

```json
{
  "aiResponse": "I've built a calculator for you...",
  "pdfUrl": null,
  "pptUrl": null,
  "imageUrl": null,
  "title": "Build a calculator",
  "agent": "coding"
}
```

- `pdfUrl` / `pptUrl` / `imageUrl` are set when the PDF/PPT/Vision agents generate a file.
- `title` is the auto-generated conversation title (or `null`).

Possible errors:
- `400` — `prompt` or `conversationId` missing.
- `403` — insufficient credits (`{ message, credits, insufficientCredits: true }`).
- `429` — rate limit exceeded.
- `500` — agent error.

### POST /api/agent/chat/stream

Purpose: same as `/chat` but returns a **Server-Sent Events** stream of tokens.

Authentication: required.

Request: same JSON body as `/chat`.

Response: `Content-Type: text/event-stream`. Each line is `data: { ... }`:

```text
data: {"token":"Build"}

data: {"token":"ing"}

...

data: {"done":true,"pdfUrl":null,"pptUrl":null,"imageUrl":null,"title":null,"agent":"coding"}
```

On error, a final event like `data: {"error":"..."}` is sent.

---

## Payment

### GET /api/payment/plans

Purpose: list the available subscription plans.

Authentication: required. The gateway applies `protect` to the whole `/api/payment/*` prefix, so a valid session cookie is needed even for this public-looking route. The frontend calls it after login.

Response:

```json
[
  {
    "id": "free",
    "name": "Free",
    "description": "For casual users",
    "credits": 20,
    "price": 0,
    "priceLabel": "Free",
    "interval": "month",
    "features": ["20 messages per month", "Basic AI responses", "Access to all agents"]
  }
]
```

### GET /api/payment/credits

Purpose: get the current user's credits. The gateway uses this for `/api/me`.

Authentication: required.

Response:

```json
{
  "userId": "66f...",
  "plan": "free",
  "credits": 20,
  "totalCredits": 20,
  "usedCredits": 0,
  "lastResetAt": "..."
}
```

If no credit account exists, one is created and the welcome bonus (free plan credits) is applied.

### GET /api/payment/transactions

Purpose: paginated transaction history.

Authentication: required.

Query params: `page` (default 1), `limit` (default 20).

Response:

```json
{
  "transactions": [ { "userId": "...", "type": "bonus", "amount": 20, "balance": 20, "description": "Welcome bonus credits", "createdAt": "..." } ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### POST /api/payment/order/create

Purpose: create a Razorpay order for a paid plan.

Authentication: required.

Request:

```json
{ "plan": "pro" }
```

Response:

```json
{
  "id": "order_OvzD...",
  "amount": 999,
  "currency": "INR",
  "keyId": "rzp_test_...",
  "plan": "pro",
  "credits": 500,
  "orderId": "66f..."
}
```

The frontend passes `id`, `keyId`, `amount`, `currency` to the Razorpay checkout.

Possible errors:
- `400` — missing user/plan, or the plan is free/invalid.

### POST /api/payment/order/verify

Purpose: verify the Razorpay payment signature after checkout.

Authentication: required.

Request:

```json
{
  "razorpay_order_id": "order_OvzD...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "...",
  "plan": "pro"
}
```

Response (success):

```json
{ "message": "Payment verified", "plan": "pro", "credits": 500 }
```

Possible errors:
- `400` — missing details, invalid signature, or order not found.

---

# Internal API (service-to-service, not for the frontend)

These are called directly between services. They run on the service ports, not through the gateway.

## Payment Service Internal Endpoints (port 8004)

### POST /api/payment/credits/init

Called by: Auth Service (on first login).

Request:

```json
{ "userId": "66f...", "email": "john@example.com", "name": "John Doe" }
```

Response:

```json
{ "message": "User initialized", "credits": { "userId": "...", "plan": "free", "credits": 20, "..." : "..." } }
```

Also records a `bonus` transaction (welcome credits).

### POST /api/payment/credits/deduct

Called by: Agent Service (per AI request) and the shared credit middleware.

Request:

```json
{ "userId": "66f...", "agent": "pdf" }
```

The cost is looked up by agent: `message` 1, `image` 3, `pdf` 5, `ppt` 5 (default 1).

Response (success):

```json
{ "message": "Credits deducted", "deducted": 5, "credits": 15, "canProceed": true }
```

Response (insufficient credits, HTTP 403):

```json
{ "message": "Insufficient credits", "credits": 2, "canProceed": false }
```

### POST /api/payment/credits/reset

Purpose: reset a user's credits to their plan allowance. (No caller currently wired; available as an admin/internal endpoint.)

Request:

```json
{ "userId": "66f..." }
```

### POST /api/payment/plan/change

Purpose: change a user's plan directly. (No caller currently wired; available as an admin/internal endpoint.)

Request:

```json
{ "userId": "66f...", "plan": "pro" }
```

### POST /api/payment/webhook

Called by: Razorpay (server-to-server).

Purpose: confirm captured payments without relying on the client. Registered at `app.post('/api/payment/webhook', express.raw(...))` — before the JSON body parser.

Behavior:
- Verifies the `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` (only if the secret is set).
- On `payment.captured`, marks the matching order `paid`, applies the plan's credits, and records a `purchase` transaction.

Response: `{ "status": "ok" }`.

## Chat Service Endpoints Called by the Agent Service (port 8002)

The Agent Service calls the Chat Service directly using `CHAT_SERVICE_URL` (no `/api` prefix):

- `POST {CHAT_SERVICE_URL}/save-message` — same body as the public `/api/chat/save-message`.
- `GET {CHAT_SERVICE_URL}/get-conversation/:id` — to check if the title is still the default.
- `POST {CHAT_SERVICE_URL}/update-conversations` — to set the auto-generated title.

---

# Request Headers Summary

| Header | When | Set by |
| ------ | ---- | ------ |
| `Cookie: session=...` | All authenticated requests | Browser automatically (HttpOnly cookie) |
| `x-user-id` | Chat, Payment, and some agent requests | API Gateway proxy (`proxyWithHeader`) |