import express from 'express'
import dotenv from 'dotenv'
import proxy from 'express-http-proxy'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import protect from './middleware/auth.middleware.js'
import { getCurrentUser } from './controller/user.controller.js'
import { proxyWithHeader } from './utils/proxyWithHeader.js'
import rateLimiter from '../shared/rateLimiter.js'

dotenv.config()

const port = process.env.PORT

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(morgan("dev"))
app.use("/api/auth", proxy(process.env.AUTH_SERVICE));
app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE));
app.use("/api/agent", protect, rateLimiter(), proxy(process.env.AGENT_SERVICE));
app.use("/api/payment", protect, proxyWithHeader(process.env.PAYMENT_SERVICE));

app.get('/', (req, res) => {
    res.send('Gateway Server is running successfully')
})
app.get('/api/me', protect, getCurrentUser)

app.listen(port, () => {
    console.log(`Gateway Server Started on port ${port}`)
})
