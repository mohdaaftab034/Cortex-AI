import dotenv from "dotenv"
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai"

dotenv.config()

const groq = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
})

const googleModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-image",
    apiKey: process.env.GOOGLE_API_KEY,
})

const togetherModel = new ChatTogetherAI({
    model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    togetherAIApiKey: process.env.TOGETHER_API_KEY,
})

export const getModel = async () => {
    return groq;
}

export const getGoogleModel = () => {
    return googleModel;
}

export const getTogetherModel = () => {
    return togetherModel;
}