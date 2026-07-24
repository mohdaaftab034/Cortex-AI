import { getModel } from "../config/llmModels.js"

export const chatAgent = async (state) => {
    const llm = await getModel("chat");

    const prompt = state.prompt?.trim()

    if (!prompt) {
        throw new Error("Chat prompt is required")
    }

    const systemPrompt = "You are CortexAI, an intelligent AI assistant. Provide accurate, helpful, and well-formatted responses. For technical topics use GitHub Flavored Markdown. Be concise but complete."

    const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        { role: "human", content: prompt },
    ])

    return {
        ...state,
        aiResponse: response.content
    }
}