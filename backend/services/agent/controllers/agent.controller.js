import axios from "axios";
import { graph } from "../graph/graph.js";
import { getModel } from "../config/llmModels.js";
import { detectAgentByPattern } from "../agents/common.agent.js";

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:8004";

const generateTitle = async (prompt) => {
    try {
        const llm = await getModel("chat");
        const response = await llm.invoke([
            {
                role: "system",
                content: "Generate a concise, descriptive title (2-6 words) for a conversation that starts with this message. Return ONLY the title, no quotes, no punctuation, no markdown."
            },
            {
                role: "human",
                content: prompt
            }
        ])
        return response.content?.trim() || null
    } catch (error) {
        console.error("Title generation error:", error?.message || error)
        return null
    }
}

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

const CHAT_SYSTEM_PROMPT = "You are CortexAI, an intelligent AI assistant. Provide accurate, helpful, and well-formatted responses. For technical topics use GitHub Flavored Markdown. Be concise but complete."

const CODING_SYSTEM_PROMPT = `You are CortexAI, an expert programming assistant.

## Core Rules
- Write clean, efficient, well-documented code.
- ALWAYS use fenced code blocks with the correct language tag.
- Include brief explanations before code sections.
- Handle edge cases and include error handling where appropriate.
- Prefer modern syntax and best practices.
- If the user asks about a specific language, use that language.
- If no language is specified, choose the most appropriate one.

## Multi-File Project Format
When the user asks to build an app, project, or anything with multiple files:

1. Start with a short explanation of what you're building.
2. For EACH file, use a fenced code block with the format:
   \`\`\`language:filename
   code here
   \`\`\`
3. Include ALL files needed for the project (e.g., index.html, style.css, script.js, etc.)
4. After the code, add brief usage instructions.
5. Put the filename as a heading before each code block.`

export const agent = async (req, res) => {
    try {
        const { prompt, conversationId, agent: selectedAgent } = req.body;

        if (!prompt?.trim() || !conversationId) {
            return res.status(400).json({ message: "prompt and conversationId are required" });
        }

        const agentType = ["auto", "chat", "coding", "search", "pdf", "ppt", "vision"].includes(selectedAgent)
            ? selectedAgent
            : "auto";

        const saveMessage = async (role, content, agent, pdfUrl, pptUrl, imageUrl) => {
            try {
                await axios.post(`${process.env.CHAT_SERVICE_URL}/save-message`, {
                    conversationId,
                    role,
                    content,
                    ...(agent ? { agent } : {}),
                    ...(pdfUrl ? { pdfUrl } : {}),
                    ...(pptUrl ? { pptUrl } : {}),
                    ...(imageUrl ? { imageUrl } : {}),
                });
            } catch (error) {
                console.error(`Failed to save ${role} message:`, error?.message || error);
            }
        };

        await saveMessage("user", prompt)

        const userId = req.headers["x-user-id"]
        if (userId) {
            try {
                const creditCost = { pdf: 5, ppt: 5, image: 3, vision: 3 }[agentType] || 1
                const { data: deductResult } = await axios.post(`${PAYMENT_SERVICE_URL}/api/payment/credits/deduct`, {
                    userId,
                    agent: agentType,
                }, { timeout: 5000 })
                if (deductResult && deductResult.canProceed === false) {
                    return res.status(403).json({
                        message: deductResult.message || "Insufficient credits",
                        credits: deductResult.credits || 0,
                        insufficientCredits: true,
                    })
                }
            } catch (error) {
                console.error("Credit deduction error:", error?.response?.data || error?.message || error)
            }
        }

        const result = await graph.invoke({
            prompt,
            conversationId,
            agent: agentType,
        })
        const aiResponse = typeof result?.aiResponse === "string"
            ? result.aiResponse
            : String(result?.aiResponse ?? "")

        const pdfUrl = result?.pdfUrl || null
        const pptUrl = result?.pptUrl || null
        const imageUrl = result?.imageUrl || null
        const actualAgent = result?.agent || agentType

        if (aiResponse) {
            await saveMessage("assistant", aiResponse, actualAgent, pdfUrl, pptUrl, imageUrl)
        }

        let title = null
        try {
            const convRes = await axios.get(`${process.env.CHAT_SERVICE_URL}/get-conversation/${conversationId}`)
            if (convRes.data && (!convRes.data.title || convRes.data.title === "New Chat")) {
                title = await generateTitle(prompt)
                if (title) {
                    await axios.post(`${process.env.CHAT_SERVICE_URL}/update-conversations`, {
                        id: conversationId,
                        title
                    })
                }
            }
        } catch (error) {
            console.error("Failed to update conversation title:", error?.message || error)
        }

        return res.status(200).json({ aiResponse, pdfUrl, pptUrl, imageUrl, title, agent: actualAgent })

    } catch (error) {
        console.error("Agent error:", error)
        return res.status(500).json({message: `Agent error ${error}`})
    }
}

export const streamAgent = async (req, res) => {
    let keepAlive;
    try {
        const { prompt, conversationId, agent: selectedAgent } = req.body;

        if (!prompt?.trim() || !conversationId) {
            return res.status(400).json({ message: "prompt and conversationId are required" });
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        keepAlive = setInterval(() => { try { res.write(":keepalive\n\n"); } catch {} }, 15000);

        req.on("close", () => {
            if (keepAlive) clearInterval(keepAlive);
        });

        const saveMessage = async (role, content, agent, pdfUrl, pptUrl, imageUrl) => {
            try {
                await axios.post(`${process.env.CHAT_SERVICE_URL}/save-message`, {
                    conversationId,
                    role,
                    content,
                    ...(agent ? { agent } : {}),
                    ...(pdfUrl ? { pdfUrl } : {}),
                    ...(pptUrl ? { pptUrl } : {}),
                    ...(imageUrl ? { imageUrl } : {}),
                });
            } catch (error) {
                console.error(`Failed to save ${role} message:`, error?.message || error);
            }
        };

        await saveMessage("user", prompt);

        let agentType = ["auto", "chat", "coding", "search", "pdf", "ppt", "vision"].includes(selectedAgent)
            ? selectedAgent
            : "auto"

        const userId = req.headers["x-user-id"]
        if (userId) {
            try {
                const creditCost = { pdf: 5, ppt: 5, image: 3, vision: 3 }[agentType] || 1
                const { data: deductResult } = await axios.post(`${PAYMENT_SERVICE_URL}/api/payment/credits/deduct`, {
                    userId,
                    agent: agentType,
                }, { timeout: 5000 })
                if (deductResult && deductResult.canProceed === false) {
                    return res.status(403).json({
                        message: deductResult.message || "Insufficient credits",
                        credits: deductResult.credits || 0,
                        insufficientCredits: true,
                    })
                }
            } catch (error) {
                console.error("Credit deduction error:", error?.response?.data || error?.message || error)
            }
        }

        if (agentType === "auto") {
            agentType = detectAgentByPattern(prompt) || "chat";
        }

        let aiResponse = "";
        let pdfUrl = null, pptUrl = null, imageUrl = null;
        const actualAgent = agentType;

        if (agentType === "chat") {
            const llm = await getModel("chat");
            const stream = await llm.stream([
                { role: "system", content: CHAT_SYSTEM_PROMPT },
                { role: "human", content: prompt },
            ]);
            for await (const chunk of stream) {
                const token = typeof chunk.content === "string" ? chunk.content : "";
                if (token) {
                    aiResponse += token;
                    res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
            }
        } else if (agentType === "coding") {
            const llm = await getModel("coding");
            const stream = await llm.stream([
                { role: "system", content: CODING_SYSTEM_PROMPT },
                { role: "human", content: prompt },
            ]);
            for await (const chunk of stream) {
                const token = typeof chunk.content === "string" ? chunk.content : "";
                if (token) {
                    aiResponse += token;
                    res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
            }
        } else if (agentType === "search") {
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

            const stream = await llm.stream([
                { role: "system", content: systemPrompt },
                { role: "human", content: prompt },
            ]);
            for await (const chunk of stream) {
                const token = typeof chunk.content === "string" ? chunk.content : "";
                if (token) {
                    aiResponse += token;
                    res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
            }
        } else {
            const result = await graph.invoke({ prompt, conversationId, agent: agentType });
            aiResponse = typeof result?.aiResponse === "string"
                ? result.aiResponse
                : String(result?.aiResponse ?? "");
            pdfUrl = result?.pdfUrl || null;
            pptUrl = result?.pptUrl || null;
            imageUrl = result?.imageUrl || null;

            const words = aiResponse.split(" ");
            for (let i = 0; i < words.length; i++) {
                const token = words[i] + (i < words.length - 1 ? " " : "");
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
                await new Promise((r) => setTimeout(r, 20));
            }
        }

        if (aiResponse) {
            await saveMessage("assistant", aiResponse, actualAgent, pdfUrl, pptUrl, imageUrl);
        }

        let title = null;
        try {
            const convRes = await axios.get(`${process.env.CHAT_SERVICE_URL}/get-conversation/${conversationId}`);
            if (convRes.data && (!convRes.data.title || convRes.data.title === "New Chat")) {
                title = await generateTitle(prompt);
                if (title) {
                    await axios.post(`${process.env.CHAT_SERVICE_URL}/update-conversations`, {
                        id: conversationId,
                        title,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to update conversation title:", error?.message || error);
        }

        res.write(`data: ${JSON.stringify({ done: true, pdfUrl, pptUrl, imageUrl, title, agent: actualAgent })}\n\n`);
    } catch (error) {
        console.error("Stream agent error:", error);
        try {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        } catch {}
    } finally {
        if (keepAlive) clearInterval(keepAlive);
        try { res.end(); } catch {}
    }
};
