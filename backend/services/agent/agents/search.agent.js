import axios from "axios";
import { getModel } from "../config/llmModels.js";

const searchTavily = async (query) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey || apiKey === "tvly-dev-api-key") return null;
    try {
        const { data } = await axios.post("https://api.tavily.com/search", {
            api_key: apiKey,
            query,
            search_depth: "advanced",
            include_answer: true,
            max_results: 6,
        });
        return data;
    } catch {
        return null;
    }
};

export const searchAgent = async (state) => {
    const prompt = state.prompt?.trim();
    if (!prompt) throw new Error("Search prompt is required");

    const llm = await getModel("chat");
    const tavilyData = await searchTavily(prompt);

    let systemPrompt;
    if (tavilyData?.results?.length > 0) {
        const { answer, results } = tavilyData;
        const context = results
            .map((r) => `Title: ${r.title}\nContent: ${r.content}`)
            .join("\n\n---\n\n");

        const sources = results
            .map((r, i) => `${i + 1}. [${r.title}](${r.url})`)
            .join("\n");

        systemPrompt = `You are a search assistant with live web results.

## Guidelines
- Synthesize the following search results to answer the user's query.
- Cite sources using numbered references like [1], [2], etc.
- Use markdown formatting for readability.

Search Results:
${context}

${answer ? `Summary: ${answer}` : ""}

---
**Sources:**
${sources}`;
    } else {
        systemPrompt = `You are a search assistant.

## Guidelines
- Answer the user's query using your knowledge.
- Clearly state that you cannot access live web search results right now.
- Use markdown formatting for readability.`;
    }

    const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        { role: "human", content: prompt },
    ]);

    return {
        ...state,
        aiResponse: response.content,
    };
};