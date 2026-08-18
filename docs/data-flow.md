# Data Flow

This page walks through the most important end-to-end flows in the application, based on the actual code.

---

## 1. Login Flow

```text
User clicks "Continue with Google"
   ↓
Frontend: signInWithPopup(auth, googleProvider) → Google account
   ↓
Frontend: user.getIdToken() → Firebase ID token
   ↓
Frontend: POST /api/auth/login { token }
   ↓
API Gateway: no session needed for /api/auth → forwards to Auth Service
   ↓
Auth Service: verifyIdToken(token) with Firebase Admin
   ↓
User exists? no → create User in MongoDB (auth db)
   ↓
User exists? yes → load existing user
   ↓
New user? → Auth → Payment: POST /api/payment/credits/init (creates credit account, bonus tx)
   ↓
Auth Service: sessionId = randomUUID()
   ↓
Redis: SET session-<sessionId> = { userId, name, email, avatar } EX 7 days
   ↓
Response sets HttpOnly `session` cookie
   ↓
Frontend: store user in Redux (setUserData) → login overlay disappears
```

**Key points:** first login registers the user; the session lives in Redis, and only the cookie UUID reaches the browser.

---

## 2. Creating a Conversation

```text
User clicks "New Chat" or sends the first message without a conversation
   ↓
Frontend: GET /api/chat/create-conversation
   ↓
API Gateway: protect (session found in Redis) → x-user-id header added
   ↓
Chat Service: creates Conversation { userId: x-user-id, title: "New Chat" }
   ↓
Chat Service: writes to MongoDB (chat db) → returns conversation
   ↓
Frontend: adds it to Redux and selects it
```

---

## 3. Sending a Message (Auto agent) — Non-Streaming

This is the core flow for `POST /api/agent/chat`.

```text
User types "Build a calculator app" and hits send
   ↓
Frontend (ChatInput): ensures a conversation exists
   ↓
Frontend: appends user message to Redux
   ↓
Frontend: POST /api/agent/chat { prompt, conversationId, agent: "auto" }
   ↓
API Gateway: protect → session OK
   ↓
API Gateway: rateLimiter → count++ in Redis (30/min limit)
   ↓
API Gateway: forwards to Agent Service
   ↓
Agent Service: saves user message → Chat Service (POST /save-message, role: "user")
   ↓
Agent Service: deducts credit → Payment Service (POST /api/payment/credits/deduct, agent: "auto" → cost 1)
   ↓    (if canProceed === false → 403 insufficient credits)
Agent Service: graph.invoke({ prompt, conversationId, agent: "auto" })
   ↓
LangGraph: router → agent becomes "common"
   ↓
commonAgent: detectAgentByPattern → "coding" (keywords) — or asks the LLM
   ↓
Coding Agent: Groq LLM returns code with file blocks
   ↓
Agent Service: saves assistant message → Chat Service (role: "assistant", agent, content)
   ↓
Agent Service: checks conversation title → still "New Chat"? → generateTitle(prompt)
   ↓
Agent Service: Chat Service POST /update-conversations { id, title }
   ↓
Response: { aiResponse, pdfUrl, pptUrl, imageUrl, title, agent } → Gateway → Frontend
   ↓
Frontend: appends assistant message, reveals text word-by-word, opens panels for files
```

### Which service does what

| Step | Service | Database / external |
| ---- | ------- | ------------------- |
| Save user message | Chat Service | MongoDB `chat` |
| Deduct credit | Payment Service | MongoDB `payment` |
| Route prompt | Agent Service (LangGraph) | — |
| Generate text | Agent Service → Groq | Groq API |
| Save assistant message | Chat Service | MongoDB `chat` |
| Set title | Chat Service | MongoDB `chat` |

---

## 4. Sending a Message — Streaming

`POST /api/agent/chat/stream` follows the same steps as flow 3, with these differences:

- The gateway forwards to the Agent Service, which responds with `Content-Type: text/event-stream`.
- The frontend uses `fetch` with `credentials: "include"` and reads `data: {...}` lines.
- For **chat/coding/search**, tokens are streamed directly from the LLM (`data: {"token":"..."}`).
- For **pdf/ppt/vision**, the graph runs to completion, then the response is replayed word-by-word, and a final `data: {"done":true,...}` event carries the file URLs and title.
- The user message is saved and the credit deducted before streaming starts (same as flow 3).

---

## 5. Generating a PDF (PDF agent)

```text
User selects "PDF" agent and asks to create a document
   ↓
Agent Service (pdfAgent):
   1. Groq LLM generates markdown document content
   2. generatePDF(markdown) → PDFKit builds a PDF buffer
   3. Upload to Cloudinary (resource_type: "raw", folder cortex-pdfs)
   4. LLM generates a short "your document is ready" message
   ↓
Returns { aiResponse, pdfUrl: cloudinary_url }
   ↓
Agent Service saves the message (with pdfUrl) in Chat Service
   ↓
Frontend: opens PdfPanel with the pdfUrl (react-pdf renders it)
```

Cost: **5 credits** (pdf). Same pattern for **PPT** (PptxGenJS → Cloudinary `cortex-ppts`, cost 5) and **Vision/Image** (Gemini generates an image → Cloudinary `cortex-images`, cost 3).

---

## 6. Upgrading a Plan (Razorpay)

```text
User clicks the coins icon → PlansModal opens
   ↓
Frontend: GET /api/payment/plans (through gateway)
   ↓
Payment Service: returns plan list from utils/plans.js
   ↓
User clicks "Subscribe — ₹9.99" on the Pro plan
   ↓
Frontend: POST /api/payment/order/create { plan: "pro" }
   ↓
API Gateway: protect → forwards with x-user-id
   ↓
Payment Service: creates Order in MongoDB (status "created")
   ↓
Payment Service: Razorpay API → orders.create(...)
   ↓
Response: { id, amount, currency, keyId, plan, credits } → Frontend
   ↓
Frontend: opens window.Razorpay checkout with order id + keyId
   ↓
User pays in the Razorpay popup
   ↓
Razorpay (handler) → frontend reloads page
   ↓
(Also) Razorpay webhook → POST /api/payment/webhook (raw body, signature verified)
   ↓
Payment Service: marks Order "paid", applies plan credits to UserCredits, records "purchase" transaction
```

> Note: the frontend's `handler` reloads the page after payment; the server-side confirmation of the order/credits happens through the Razorpay webhook.

---

## 7. Logout Flow

```text
User clicks the logout button
   ↓
Frontend: GET /api/auth/logout (cookie sent automatically)
   ↓
API Gateway: forwards to Auth Service (no session required)
   ↓
Auth Service: redis.del("session-<uuid>") → clears the session
   ↓
Auth Service: res.clearCookie("session")
   ↓
Frontend: setUserData(null) → login overlay shows again
```

---

## 8. Loading an Existing Conversation

```text
User clicks a conversation in the sidebar
   ↓
Frontend: dispatch(setSelectConversation(conv))
   ↓
ChatArea: GET /api/chat/get-messages/:conversationId (through gateway)
   ↓
Chat Service: returns all messages for the conversation
   ↓
Frontend: setMessages(messages) → MessageList renders them
   ↓
MessageBubble: for assistant messages renders markdown; for pdfUrl/pptUrl/imageUrl shows buttons; for coding artifacts shows the file viewer
```

---

## Cross-Service Summary

| Flow | Services involved | Database/External |
| ---- | ----------------- | ----------------- |
| Login | Frontend → Gateway → Auth → Payment | Redis, MongoDB `auth` + `payment`, Firebase |
| New conversation | Frontend → Gateway → Chat | MongoDB `chat` |
| Send message | Frontend → Gateway → Agent → Chat + Payment | MongoDB `chat` + `payment`, Groq/Gemini/Tavily/Cloudinary |
| Generate PDF/PPT/Image | Frontend → Gateway → Agent (→ Payment, Chat) | Cloudinary, LLMs |
| Upgrade plan | Frontend → Gateway → Payment → Razorpay | MongoDB `payment`, Razorpay |
| Logout | Frontend → Gateway → Auth | Redis |
| Load messages | Frontend → Gateway → Chat | MongoDB `chat` |