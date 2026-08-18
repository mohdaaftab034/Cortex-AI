# Authentication

CortexAI uses **Google Sign-In** through Firebase, with server-side sessions stored in **Redis** and delivered via an **HttpOnly cookie**. There is no username/password login and no JWT stored in the browser.

## High-Level Flow

```text
User clicks "Continue with Google"
   ↓
Frontend (Firebase) — Google popup, returns an ID token
   ↓
Frontend POST /api/auth/login { token }
   ↓
API Gateway (no session needed for login) → Auth Service
   ↓
Auth Service verifies the token with Firebase Admin
   ↓
Auth Service creates/finds the user in MongoDB
   ↓
Auth Service stores a session in Redis
   ↓
Auth Service sets the HttpOnly `session` cookie
   ↓
Frontend — every later request automatically sends the cookie
```

## Registration

There is no separate registration page. **First login = registration**:

- The frontend runs `signInWithPopup(auth, googleProvider)` (`utils/firebase.js`).
- After the user picks a Google account, the frontend gets a Firebase ID token with `user.getIdToken()`.
- The token is posted to `POST /api/auth/login`.
- In the Auth Service (`controllers/auth.controller.js`), `getAuth(app).verifyIdToken(token)` validates it.
- The service then looks for a user by `firebaseUid`. If none exists, it creates one with `name`, `email`, and `avatar` from the token, and calls the Payment Service to create the user's credit account (`POST /api/payment/credits/init`).

## Login

The login request body is just the Firebase ID token:

```json
{
  "token": "eyJhbGciOi..."
}
```

On success:

- A session ID is generated with `crypto.randomUUID()`.
- The session is stored in Redis as `session-<uuid>` with the user data:

```json
{
  "userId": "...",
  "name": "...",
  "email": "...",
  "avatar": "..."
}
```

- The TTL is **7 days** (`'EX', 60 * 60 * 24 * 7`).
- The `session` cookie is set:

```
Name:     session
Value:    <uuid>
HttpOnly: true
Secure:   false        (development)
SameSite: strict
Max-Age:  7 days
```

- The user document is returned to the frontend.

## Password Handling

Passwords are **not handled anywhere** — authentication is delegated to Google/Firebase. There are no password fields, hashing, or reset flows in the code.

## Token / Session Creation

- Firebase issues the short-lived **ID token** (frontend).
- The backend creates its own **session** in Redis (server-side), identified only by a random UUID in the cookie. The token itself is never stored by the backend.

## Token / Session Storage

| Where | What |
| ----- | ---- |
| Browser | The HttpOnly `session` cookie (not readable by JavaScript) |
| Redis | `session-<uuid>` → JSON user data (7-day expiry) |
| Firebase | The ID token is short-lived and used only for login |

## Authentication Middleware

`protect` in `backend/gateway/middleware/auth.middleware.js` guards every protected gateway route:

1. Reads `req.cookies.session`.
2. No cookie → `400 { message: "Unauthorized" }`.
3. Looks up `session-<uuid>` in Redis.
4. Missing → `400 { message: "Session Expired" }`.
5. Parses the JSON into `req.user` and continues.

```js
// backend/gateway/middleware/auth.middleware.js (simplified)
const protect = async (req, res, next) => {
  const sessionId = req.cookies?.session
  if (!sessionId) return res.status(400).json({ message: 'Unauthorized' })
  const session = await redis.get(`session-${sessionId}`)
  if (!session) return res.status(400).json({ message: "Session Expired" })
  req.user = JSON.parse(session)
  next()
}
```

## Protected Routes

On the gateway, everything except `/api/auth/*` and `/` requires a valid session:

| Route | Protected |
| ----- | --------- |
| `GET /` | no |
| `POST /api/auth/login` | no |
| `GET /api/auth/logout` | no |
| `GET /api/me` | yes |
| `/api/chat/*` | yes |
| `/api/agent/*` | yes (+ rate limit) |
| `/api/payment/*` | yes |

Downstream services trust the gateway. For `/api/chat` and `/api/payment`, the gateway injects the `x-user-id` header (via `proxyWithHeader`), and those services read the user from that header. For `/api/agent`, the gateway adds the same header if the user is authenticated.

## Authorization / Roles

There are **no roles or admin permissions**. Every authenticated user has the same access. The only distinction is the **credit plan** (free/pro/business), which controls how many AI requests a user can make — enforced by the Payment Service (insufficient credits → HTTP 403 with `insufficientCredits: true`).

## Logout

`GET /api/auth/logout` (forwarded to the Auth Service):

1. Deletes `session-<uuid>` from Redis (`redis.del`).
2. Clears the `session` cookie (`res.clearCookie('session')`).

The frontend then clears the user from Redux (`setUserData(null)`), which shows the login overlay again.

## Frontend Handling

- `utils/axios.js` sets `withCredentials: true`, so the browser sends the cookie with every request.
- `App.jsx` calls `getCurrentUser()` (`GET /api/me`) on startup. A valid session returns the user (and credits); otherwise `null` and the login overlay appears.
- `Home.jsx` shows the login overlay whenever `userData` is null.

## Summary Flow Diagram

```text
User
 ↓
Frontend (Google popup → Firebase ID token)
 ↓
API Gateway → Auth Service (verify + create session)
 ↓
Redis: session-<uuid> = user data  ←→  HttpOnly `session` cookie
 ↓
Frontend (now authenticated; cookie sent on every request)
 ↓
Gateway `protect` middleware checks Redis on protected routes
 ↓
Chat / Agent / Payment Service (with x-user-id header)
```