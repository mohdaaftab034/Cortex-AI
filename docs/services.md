# Services

Detailed documentation for every backend service, including the API Gateway.

---

## API Gateway

### Purpose
The single entry point for the frontend. Checks sessions and forwards requests to the correct service.

### Location
`backend/gateway/`

### Responsibilities
- Validate the `session` cookie against Redis (`protect` middleware).
- Forward `/api/auth`, `/api/chat`, `/api/agent`, `/api/payment` to the matching service.
- Add the `x-user-id` header when proxying to Chat and Payment services.
- Rate-limit `/api/agent` requests (30/min/user).
- Serve `GET /api/me` (current user + credits).
- Enable CORS for the frontend.

### API Routes
| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `GET /` | no | Health check |
| `POST /api/auth/login` | no | Forwarded to Auth Service |
| `GET /api/auth/logout` | no | Forwarded to Auth Service |
| `/api/chat/*` | yes | Forwarded to Chat Service |
| `/api/agent/*` | yes + rate limit | Forwarded to Agent Service |
| `/api/payment/*` | yes | Forwarded to Payment Service |
| `GET /api/me` | yes | Current user + credits |

### Database
None directly. Uses Redis for sessions and rate limiting.

### Environment Variables
`PORT`, `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `PAYMENT_SERVICE`, `FRONTEND_URL`, `REDIS_URL`

### Communication
- Calls the Payment Service (`GET /api/payment/credits`) when serving `/api/me`.
- Reads sessions from Redis.

### Important Files
- `index.js` — app setup, routes, proxy configuration
- `middleware/auth.middleware.js` — session check
- `controller/user.controller.js` — `/api/me` handler
- `utils/proxyWithHeader.js` — proxy that injects `x-user-id`

---

## Auth Service

### Purpose
Authenticates users with Google and manages sessions.

### Location
`backend/services/auth/`

### Responsibilities
- Verify the Firebase ID token sent by the frontend.
- Find or create the user in MongoDB.
- Store a session in Redis and set the `session` cookie (7 days).
- Initialize the user's credit account in the Payment Service (first login only).
- Remove the session and clear the cookie on logout.

### API Routes
| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `POST /login` | no | Body: `{ token }` (Firebase ID token) → verifies, creates session, sets cookie |
| `GET /logout` | no | Deletes the Redis session and clears the cookie |

### Database
MongoDB (`.../auth`), collection `users`. Model: `User` (`firebaseUid`, `name`, `email`, `avatar`, timestamps).

### Environment Variables
`PORT`, `MONGODB_URI`, `PAYMENT_SERVICE`, `REDIS_URL`

Also requires the Firebase Admin service account file `serviceAccountKey.json` next to `config/`.

### Communication
- Writes/removes sessions in Redis (`session-<uuid>`).
- Calls the Payment Service (`POST /api/payment/credits/init`) on first login to create the credit account.

### Important Files
- `index.js` — Express app
- `routes/auth.route.js` — routes
- `controllers/auth.controller.js` — login/logout logic
- `config/firebase.js` — Firebase Admin app
- `config/db.js` — MongoDB connection
- `models/user.model.js` — User schema

---

## Chat Service

### Purpose
Stores conversations and messages for every user.

### Location
`backend/services/chat/`

### Responsibilities
- Create conversations (default title `New Chat`).
- List a user's conversations (newest first).
- Get a single conversation.
- Update a conversation title.
- Save messages (user/assistant) with optional file URLs and the agent name.
- Get all messages of a conversation.

### API Routes
| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `GET /create-conversation` | yes (via gateway) | Creates a conversation for the `x-user-id` user |
| `GET /get-conversations` | yes (via gateway) | Lists the user's conversations |
| `GET /get-conversation/:id` | yes (via gateway) | Gets one conversation |
| `POST /update-conversations` | yes (via gateway) | Body: `{ id, title }` |
| `POST /save-message` | yes (via gateway) | Body: `{ conversationId, role, content, agent?, pdfUrl?, pptUrl?, imageUrl? }` |
| `GET /get-messages/:conversationId` | yes (via gateway) | Lists messages of a conversation |

### Database
MongoDB (`.../chat`), collections `conversations` and `messages`.

- **Conversation:** `title` (default `"New Chat"`), `userId`, timestamps.
- **Message:** `conversationId` (ref → Conversation), `role` (`user`/`assistant`), `content`, `agent`, `pdfUrl`, `pptUrl`, `imageUrl`, timestamps.

### Environment Variables
`PORT`, `MONGODB_URI`

### Communication
- Receives the user ID from the `x-user-id` header (added by the gateway).
- Called directly by the Agent Service (`/save-message`, `/get-conversation/:id`, `/update-conversations`).

### Important Files
- `index.js` — Express app
- `routes/chat.routes.js` — routes
- `controllers/chat.controller.js` — conversation/message logic
- `models/conversation.model.js`, `models/message.model.js` — schemas

---

## Agent Service

### Purpose
Runs the AI agents: chat, coding, search, PDF, PPT, and vision/image generation.

### Location
`backend/services/agent/`

### Responsibilities
- Accept chat prompts (regular and SSE-streamed).
- Route each prompt to the right agent using a LangGraph state machine.
- Call LLM providers: Groq (chat/coding/search/pdf/ppt), Google Gemini (image generation), Together AI (defined, not the default).
- Use Tavily for web search results.
- Generate PDFs (PDFKit) and PPTs (PptxGenJS), upload them to Cloudinary.
- Upload generated images to Cloudinary.
- Deduct credits via the Payment Service.
- Save user/assistant messages and auto-title conversations via the Chat Service.

### API Routes
| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `POST /chat` | yes (via gateway) | Body: `{ prompt, conversationId, agent }` → full AI response |
| `POST /chat/stream` | yes (via gateway) | Same body → Server-Sent Events stream of tokens |

**Agent selection:** `agent` can be `auto`, `chat`, `coding`, `search`, `pdf`, `ppt`, `vision`. Anything else becomes `auto`. In `auto` mode, `detectAgentByPattern` first checks keywords, then the `commonAgent` LLM decides.

### The LangGraph Flow
```
start → router → common (if auto) → chat | coding | search | pdf | ppt | vision → end
```

- `graph/state.js` — shared state `{ prompt, aiResponse, agent, conversationId, pdfUrl, pptUrl, imageUrl }`.
- `graph/router.js` — sets `agent` to `common` when it is `auto`.
- `graph/graph.js` — wires the nodes and conditional edges.
- `agents/common.agent.js` — decides the agent (pattern + LLM) and exports `detectAgentByPattern`.
- `agents/chat.agent.js`, `coding.agent.js`, `search.agent.js`, `pdf.agent.js`, `ppt.agent.js`, `vision.agent.js` — the specialized agents.

### Database
MongoDB (`.../agent`) — connected, but **no models are defined**; the service doesn't store data directly.

### Environment Variables
`PORT`, `MONGODB_URI`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `TOGETHER_API_KEY`, `TAVILY_API_KEY`, `CHAT_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Communication
- **→ Payment Service:** `POST /api/payment/credits/deduct` to spend credits (cost: message 1, image 3, pdf 5, ppt 5).
- **→ Chat Service:** `POST /save-message`, `GET /get-conversation/:id`, `POST /update-conversations`.
- **→ External:** Groq, Google Gemini, Together AI, Tavily, Cloudinary.

### Important Files
- `index.js` — Express app (also serves `/uploads` statically)
- `routes/agent.route.js` — routes
- `controllers/agent.controller.js` — request handling, credit deduction, message saving, title generation
- `graph/*` — LangGraph workflow
- `agents/*` — the individual agents
- `config/llmModels.js` — LLM instances (Groq, Gemini, Together)
- `utils/pdfGenerator.js`, `utils/pptGenerator.js` — file generation

---

## Payment Service

### Purpose
Manages user credits, subscription plans, and Razorpay payments.

### Location
`backend/services/payment/`

### Responsibilities
- Create a credit account per user (default free plan, 20 credits).
- Report and deduct credits (per-agent cost).
- Reset credits to the plan allowance.
- Change a user's plan.
- List subscription plans.
- Create and verify Razorpay orders.
- Handle the Razorpay webhook (payment.captured).
- Record a transaction history for every credit event.

### API Routes
| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `GET /plans` | no | List plans (Free/Pro/Business) |
| `GET /credits` | yes | Current credits of the `x-user-id` user |
| `GET /transactions` | yes | Paginated transaction history (`?page`, `?limit`) |
| `POST /credits/deduct` | internal | Body: `{ userId, agent }` → deducts the credit cost |
| `POST /credits/reset` | internal | Body: `{ userId }` → resets credits to plan allowance |
| `POST /credits/init` | internal | Body: `{ userId, email, name }` → creates the credit account |
| `POST /plan/change` | internal | Body: `{ userId, plan }` → changes the plan |
| `POST /order/create` | yes | Body: `{ plan }` → creates a Razorpay order |
| `POST /order/verify` | yes | Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }` |
| `POST /api/payment/webhook` | Razorpay | Verifies the webhook signature and marks orders paid |

> The routes marked **internal** are meant to be called by other services, not by the frontend directly.

### Plans and Credit Costs (`utils/plans.js`)
| Plan | Credits | Price | Interval |
| ---- | ------- | ----- | -------- |
| free | 20 | ₹0 | month |
| pro | 500 | ₹9.99 | month |
| business | 2000 | ₹24.99 | month |

Credit cost per request: `message` = 1, `image` = 3, `pdf` = 5, `ppt` = 5.

### Database
MongoDB (`.../payment`), collections:
- `usercredits` — `userId` (unique), `email`, `name`, `plan`, `credits`, `totalCredits`, `usedCredits`, `lastResetAt`, `isActive`
- `transactions` — `userId`, `type` (`credit`/`debit`/`purchase`/`reset`/`refund`/`bonus`), `amount`, `balance`, `description`, `agent`, `razorpayPaymentId`, `razorpayOrderId`, `plan`, `metadata`
- `orders` — `userId`, `razorpayOrderId` (unique), `razorpayPaymentId`, `razorpaySignature`, `plan`, `amount`, `credits`, `status` (`created`/`paid`/`failed`)

### Environment Variables
`PORT`, `MONGODB_URI`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `REDIS_URL`

### Communication
- Called by the **Auth Service** (`/credits/init`), the **Gateway** (`/credits`), and the **Agent Service** (`/credits/deduct`).
- Talks to **Razorpay** to create orders and verify payments/webhooks.

### Important Files
- `index.js` — Express app (webhook route uses raw body parsing)
- `routes/payment.routes.js` — routes
- `controllers/payment.controller.js` — all payment/credit logic
- `models/UserCredits.js`, `models/Transaction.js`, `models/Order.js` — schemas
- `utils/plans.js` — plan and cost definitions