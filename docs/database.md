# Database

The project uses **MongoDB** (via Mongoose) plus **Redis**.

- **MongoDB** stores the persistent data. Each service connects to its **own database** (MongoDB Atlas in the development `.env` files).
- **Redis** stores sessions and rate-limit counters (not a primary database).

> No database credentials are shown in this documentation. Connection strings come from each service's `.env` (`MONGODB_URI`, `REDIS_URL`).

## Databases Overview

| Service | Database | Type | Main Data |
| ------- | -------- | ---- | --------- |
| Auth Service | `.../auth` | MongoDB | Users |
| Chat Service | `.../chat` | MongoDB | Conversations, Messages |
| Agent Service | `.../agent` | MongoDB | (connected, no models defined) |
| Payment Service | `.../payment` | MongoDB | UserCredits, Transactions, Orders |
| Gateway + Auth | Redis | Key/Value | Sessions (`session-<uuid>`) |
| Gateway | Redis | Key/Value | Rate-limit counters (`ratelimit:<id>:<window>`) |

Every service's `config/db.js` is identical: it calls `mongoose.connect(process.env.MONGODB_URI)`. The database is chosen by the URI path (e.g. `...mongodb.net/auth`).

## Connection Setup

Example (`backend/services/chat/config/db.js`):

```js
import mongoose from "mongoose"

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('MongoDB connected successfully')
    } catch (error) {
        console.error('Error connecting to MongoDB:', error)
    }
}

export default connectDB
```

Each service's `index.js` calls `connectDB()` when the server starts listening.

## Redis

Configured in `backend/shared/redis/redis.js`:

```js
const redis = new Redis(process.env.REDIS_URL)
```

Used for:

- **Sessions** — the Auth Service writes `session-<uuid>` → user JSON; the gateway's `protect` middleware reads it.
- **Rate limiting** — the gateway's rate limiter increments `ratelimit:<userId>:<windowMs>`.

## Models

### Auth Service — `User` (`models/user.model.js`)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `firebaseUid` | String | Unique; the Firebase account ID |
| `name` | String | |
| `email` | String | |
| `avatar` | String | Profile picture URL |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |

### Chat Service — `Conversation` (`models/conversation.model.js`)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `title` | String | Default `"New Chat"` |
| `userId` | String | The owning user's ID |
| `createdAt` / `updatedAt` | Date | timestamps |

### Chat Service — `Message` (`models/message.model.js`)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `conversationId` | ObjectId | `ref: "Conversation"` |
| `role` | String | `enum: ["user", "assistant"]` |
| `content` | String | The message text |
| `agent` | String | Which agent produced it (e.g. `coding`) |
| `pdfUrl` | String | Generated PDF URL (assistant messages) |
| `pptUrl` | String | Generated PPT URL (assistant messages) |
| `imageUrl` | String | Generated image URL (assistant messages) |
| `createdAt` / `updatedAt` | Date | timestamps |

### Payment Service — `UserCredits` (`models/UserCredits.js`)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `userId` | String | Required, unique, indexed |
| `email` | String | Default `""` |
| `name` | String | Default `""` |
| `plan` | String | `enum: free / pro / business`, default `free` |
| `credits` | Number | Current balance, min 0, default free plan credits (20) |
| `totalCredits` | Number | Lifetime total, default 20 |
| `usedCredits` | Number | Default 0 |
| `lastResetAt` | Date | Default now |
| `isActive` | Boolean | Default true |
| `createdAt` / `updatedAt` | Date | timestamps |

Methods: `hasCredits(amount)`, `deduct(amount)`, `addCredits(amount)`.

### Payment Service — `Transaction` (`models/Transaction.js`)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `userId` | String | Required, indexed |
| `type` | String | `enum: credit, debit, purchase, reset, refund, bonus` |
| `amount` | Number | Required (negative for debits) |
| `balance` | Number | Required; balance after the transaction |
| `description` | String | Default `""` |
| `agent` | String | Default `null` |
| `razorpayPaymentId` | String | Default `null` |
| `razorpayOrderId` | String | Default `null` |
| `plan` | String | Default `null` |
| `metadata` | Mixed | Default `{}` |
| `createdAt` / `updatedAt` | Date | timestamps |

Compound index: `{ userId: 1, createdAt: -1 }`.

### Payment Service — `Order` (`models/Order.js`)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `userId` | String | Required, indexed |
| `razorpayOrderId` | String | Unique, sparse |
| `razorpayPaymentId` | String | Default `null` |
| `razorpaySignature` | String | Default `null` |
| `plan` | String | Required |
| `amount` | Number | Required |
| `credits` | Number | Required; credits this order grants |
| `status` | String | `enum: created, paid, failed`, default `created` |
| `createdAt` / `updatedAt` | Date | timestamps |

## Relationships

```text
User (auth)  1 ── N  Conversation (chat)      — conversations belong to a user (by userId)
Conversation 1 ── N  Message (chat)           — messages reference conversationId
User (auth)  1 ── 1  UserCredits (payment)    — one credit account per user (by userId)
UserCredits  1 ── N  Transaction (payment)    — every credit change is a transaction
UserCredits  1 ── N  Order (payment)          — orders reference the user and plan
```

Note: the auth `User` and payment `UserCredits` are in **different databases**; they are linked only by the shared user ID string, not by a foreign key.

## Migrations and Seed Data

There are **no migrations and no seed scripts** in the repository. Data is created at runtime:

- Users are created on first login.
- A credit account and welcome `bonus` transaction are created when the Auth Service calls `/api/payment/credits/init` (or lazily on the first `GET /api/payment/credits`).
- Conversations/messages are created as users chat.