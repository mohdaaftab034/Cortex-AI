import express from "express"
import { agent, streamAgent } from "../controllers/agent.controller.js"

const router = express.Router()

router.post("/chat", agent)
router.post("/chat/stream", streamAgent)


export default router