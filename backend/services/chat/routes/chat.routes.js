import express from 'express'
import { createConversation, getConversation, getConversations, getMessages, saveMessage, updateConversation } from '../controllers/chat.controller.js';

const router = express.Router();


router.get("/create-conversation", createConversation);
router.get("/get-conversations", getConversations)
router.get("/get-conversation/:id", getConversation)
router.post("/update-conversations", updateConversation)
router.post("/save-message", saveMessage);
router.get("/get-messages/:conversationId", getMessages);


export default router