import Conversation from "../models/conversation.model.js"
import Message from "../models/message.model.js"


export const createConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        console.log(userId)
        const conversion = await Conversation.create({
            userId: userId
        })

        return res.status(200).json(conversion)
    } catch (error) {
        return res.status(500).json({ message: `Create Conversation ${error}` })
    }
}


export const getConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        console.log(userId)
        const conversations = await Conversation.find({
            userId: userId
        }).sort({ updatedAt: -1 })

        return res.status(200).json(conversations)


    } catch (error) {
        return res.status(500).json({ message: `Get conversation ${error}` })
    }
}

export const saveMessage = async (req, res) => {
    try {
        const { conversationId, role, content, agent, pdfUrl, pptUrl, imageUrl } = req.body;
        const message = await Message.create({
            conversationId,
            content,
            role,
            agent,
            pdfUrl,
            pptUrl,
            imageUrl
        })

        return res.status(200).json(message)
    } catch (error) {
        return res.status(500).json({ message: `Save message ${error}` })
    }
}


export const getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId
        })

        return res.status(200).json(messages)
    } catch (error) {
        return res.status(500).json({ message: `Get messages ${error}` })
    }
}


export const getConversation = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id)
        return res.status(200).json(conversation)
    } catch (error) {
        return res.status(500).json({ message: `Get conversation ${error}` })
    }
}

export const updateConversation = async (req, res) => {
    try {
        const { id, title } = req.body
        const conversation = await Conversation.findByIdAndUpdate(id, {
            title
        }, { new: true })

        return res.status(200).json(conversation)
    } catch (error) {
        return res.status(500).json({ message: `Update conversation ${error}` })
    }
}

