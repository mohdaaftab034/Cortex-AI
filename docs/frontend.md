# Frontend

The frontend is a **React 19** single-page application built with **Vite 8** and **Tailwind CSS 4**. It lives in `frontend/`.

## Technology

| Area | Choice |
| ---- | ------ |
| Framework | React 19 (JSX, function components) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| State management | Redux Toolkit (`@reduxjs/toolkit` + `react-redux`) |
| HTTP client | Axios (with cookies) |
| Auth | Firebase (`firebase/auth`, Google provider) |
| Markdown rendering | `react-markdown` + `remark-gfm` |
| Code highlighting | `react-syntax-highlighter` (Prism) |
| PDF viewing | `react-pdf` |
| Icons | `lucide-react`, `react-icons` |

## Folder Structure

```text
frontend/
├── index.html              # HTML entry point
├── vite.config.js          # Vite + React + Tailwind plugins
├── eslint.config.js        # ESLint setup
├── package.json
├── .env                    # VITE_SERVER_URL, VITE_FIREBASE_API_KEY
├── public/                 # Static assets (favicons)
├── utils/
│   ├── axios.js            # Axios instance pointing at the gateway
│   └── firebase.js         # Firebase app + Google auth provider
└── src/
    ├── main.jsx            # Mounts <App /> inside the Redux <Provider>
    ├── App.jsx             # Loads current user on startup, renders <Home />
    ├── index.css           # Global styles
    ├── pages/Home.jsx      # The single page (login overlay + sidebar + chat)
    ├── components/         # UI components
    ├── features/           # API call functions
    ├── hooks/usePageTitle.js
    ├── redux/              # Slices + store
    └── utils/              # artifactParser.js, getDocuments.js
```

## Pages / Routes

The app has **one page**: `Home` (`src/pages/Home.jsx`). There is no router. The page shows:

- The `Sidebar` (conversation list, user card, plans, logout)
- The `ChatArea` (chat messages + input + viewer panels)
- A login overlay when `userData` is null

## State Management (Redux)

The store (`src/redux/store.js`) combines seven slices:

| Slice | Holds |
| ----- | ----- |
| `user` | `userData` — the logged-in user (includes credits) |
| `conversation` | `conversations`, `selecedConversation`, loading flags |
| `message` | `messages`, `isAiLoading`, `isMessagesLoading` |
| `artifact` | `files` (code files) + panel open/close state |
| `pdf` | `pdfUrl` + panel open/close state |
| `ppt` | `pptUrl` + panel open/close state |
| `image` | `imageUrl` + panel open/close state |

Examples of slice actions used across the app:

- `setUserData(user)` after login/logout
- `setConversations(list)` / `addConversation(conv)` / `setSelectConversation(conv)`
- `setMessages(list)` / `appendMessage(msg)` / `updateLastAssistantContent(text)`
- `openPdf(url)` / `openPpt(url)` / `openImage(url)` / `setArtifact(files)`

## API Integration

All API calls go through one Axios instance (`utils/axios.js`):

```js
export const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,  // e.g. http://localhost:8000
    withCredentials: true                       // sends the session cookie
})
```

Because `withCredentials` is true, the browser automatically sends the `session` cookie set by the Auth Service, so the gateway can authenticate the user on every request.

The actual calls live in `src/features/`:

| Function | HTTP call | Purpose |
| -------- | --------- | ------- |
| `getCurrentUser` | `GET /api/me` | Current user + credits |
| `createConversation` | `GET /api/chat/create-conversation` | New conversation |
| `getConversations` | `GET /api/chat/get-conversations` | List of conversations |
| `getMessages(id)` | `GET /api/chat/get-messages/:id` | Messages of a conversation |
| `sendMessage(payload)` | `POST /api/agent/chat` | Non-streaming AI request |
| `streamMessage(payload, cb)` | `POST /api/agent/chat/stream` | Streaming (SSE) AI request |
| `getPlans()` | `GET /api/payment/plans` | Subscription plans |
| `createPaymentOrder(plan)` | `POST /api/payment/order/create` | Create Razorpay order |
| `logout()` | `GET /api/auth/logout` | End the session |

`streamMessage` uses the browser `fetch` API with `credentials: "include"` and reads a **Server-Sent Events** stream (`data: {...}` lines) line by line, invoking `onToken`, `onComplete`, and `onError` callbacks.

## Authentication

- Login is handled in `Home.jsx`: `signInWithPopup(auth, googleProvider)` gets a Google account, then `getIdToken()` returns a Firebase ID token, which is sent to `POST /api/auth/login`.
- The backend replies by setting the `session` cookie (HttpOnly). The frontend never sees or stores the session itself.
- On startup, `App.jsx` calls `getCurrentUser()`. If it succeeds, `userData` is set and the login overlay disappears. Logout calls `GET /api/auth/logout` and clears `userData`.

See [authentication.md](./authentication.md) for the full flow.

## Key Components

- **`Home.jsx`** — top-level layout; renders the Google login overlay when not logged in.
- **`Sidebar.jsx`** — loads conversations, "New Chat" button, conversation list, user info (name, plan badge, credit count), plans button, logout button. Collapses on small screens.
- **`ChatArea.jsx`** — loads the messages of the selected conversation, and lays out `Nav`, `MessageList`, `ChatInput`, plus the four viewer panels.
- **`ChatInput.jsx`** — the message box with an agent selector (Auto, Chat, Coding, Search, PDF, PPT, Vision). On send it creates a conversation if needed, appends the user message, calls `sendMessage`, then "reveals" the assistant response word-by-word (a typing effect). If the response contains `pdfUrl`/`pptUrl`/`imageUrl` it opens the matching panel.
- **`MessageList.jsx`** — renders messages (or a loading state / welcome screen) and auto-scrolls to the bottom.
- **`MessageBubble.jsx`** — renders a user or assistant message. Assistant messages are rendered as markdown with syntax-highlighted code blocks. For coding responses it parses multi-file code blocks and shows a "View N files" button. For PDF/PPT/Image responses it shows buttons that open the respective panels.
- **`Nav.jsx`** — top bar with conversation title, message count, and a "Documents" dropdown listing generated files (via `getDocuments`).
- **`Artifact.jsx`** — code viewer with a file tabs, syntax highlighting, and a **live preview** iframe for HTML/CSS/JS files.
- **`PdfPanel.jsx`** — PDF viewer (page navigation, zoom, download) built with `react-pdf`.
- **`PptPanel.jsx`** — PPT viewer (slide navigation, download) using the Microsoft Office online viewer.
- **`ImagePanel.jsx`** — shows a generated image with a download button.
- **`PlansModal.jsx`** — pricing modal. Loads plans, and on "Subscribe" creates a Razorpay order and opens the Razorpay checkout (`window.Razorpay`).

## Important Hooks

- `usePageTitle` — sets `document.title` to the current conversation title (`CortexAI` otherwise).

## Utilities

- `src/utils/artifactParser.js` — `parseArtifact(content)` finds fenced code blocks like ```` ```js:filename ```` and returns `{ files: [{name, language, code}], explanation }`.
- `src/utils/getDocuments.js` — `getDocuments(messages)` scans assistant messages and builds a list of generated documents (PDFs, PPTs, and code artifacts) with auto-generated titles.
- `utils/axios.js` — the shared Axios instance.
- `utils/firebase.js` — Firebase app config, `auth`, and `googleProvider`.

## Error Handling

- API functions in `src/features/` wrap calls in `try/catch`, log the error, and return `null` (or `[]`) on failure. Callers handle `null` with fallback UI (e.g. ChatInput shows "Sorry, I encountered an error...").
- `MessageList` shows loading spinners while conversations/messages are loading and while the AI is typing.
- The viewer panels (`PdfPanel`, `PptPanel`, `ImagePanel`) have their own loading and error states.
- Streaming errors are delivered through `onError`.

## Environment Variables

| Variable | Purpose |
| -------- | ------- |
| `VITE_SERVER_URL` | Base URL of the API Gateway (e.g. `http://localhost:8000`) |
| `VITE_FIREBASE_API_KEY` | Firebase web API key used by `firebase.js` |

Both must be prefixed with `VITE_` so Vite exposes them to the client. See [environment-variables.md](./environment-variables.md).

## How the Frontend Talks to the Backend

```text
Browser (React)
   ↓  Axios with credentials (session cookie)
API Gateway (http://localhost:8000)
   ↓
Correct microservice (auth / chat / agent / payment)
```

The frontend never calls services directly — everything goes through the gateway, which validates the session and adds the `x-user-id` header.