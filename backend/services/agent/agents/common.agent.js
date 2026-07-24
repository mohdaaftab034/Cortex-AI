import { getModel } from "../config/llmModels.js"

const CODING_KEYWORDS = ["build", "create", "make", "write", "implement", "code", "develop", "generate", "program", "script", "function", "app", "website", "component", "api", "algorithm", "debug", "fix", "refactor"]
const CODING_TERMS = ["calculator", "form", "button", "page", "layout", "style", "css", "html", "react", "vue", "angular", "node", "python", "javascript", "typescript", "java", "go", "rust", "sql", "database", "server", "client", "frontend", "backend", "api", "endpoint", "route", "component", "hook", "state", "redux", "tailwind", "bootstrap", "npm", "package", "module", "function", "class", "method", "variable", "array", "loop", "conditional", "regex", "script", "automation", "pipeline", "docker", "deploy", "test", "unit test", "integration", "login", "signup", "authentication", "authorization", "crud", "rest", "graphql", "socket", "websocket", "middleware", "config", "animation", "transition", "responsive"]

const SEARCH_PREFIXES = ["search for", "find", "look up", "search", "google", "what is the latest", "latest news", "current", "weather", "stock", "price of", "who is", "tell me about"]
const PDF_TERMS = ["pdf", "document", "invoice", "report", "certificate", "form"]
const PPT_TERMS = ["presentation", "slides", "slideshow", "slide deck", "ppt", "powerpoint"]
const VISION_TERMS = ["analyze image", "describe image", "what's in this image", "what is in this image", "analyze this image", "describe this image", "ocr", "extract text from image"]

function startsWithAny(text, prefixes) {
    const lower = text.toLowerCase()
    return prefixes.some(p => lower.startsWith(p))
}

function containsAny(text, terms) {
    const lower = text.toLowerCase()
    return terms.some(t => lower.includes(t))
}

export function detectAgentByPattern(prompt) {
    const lower = prompt.toLowerCase().trim()

    const hasCodingAction = containsAny(lower, CODING_KEYWORDS)
    const hasCodingTerm = containsAny(lower, CODING_TERMS)

    if (hasCodingAction && hasCodingTerm) {
        return "coding"
    }

    if (containsAny(lower, PDF_TERMS) && (containsAny(lower, ["create", "generate", "make", "build"]))) {
        return "pdf"
    }

    if (containsAny(lower, PPT_TERMS) && (containsAny(lower, ["create", "generate", "make", "build"]))) {
        return "ppt"
    }

    if (startsWithAny(lower, SEARCH_PREFIXES)) {
        return "search"
    }

    if (containsAny(lower, VISION_TERMS)) {
        return "vision"
    }

    return null
}

const SYSTEM_PROMPT = `You are an intelligent router for a multi-agent AI system. Your job is to analyze the user's prompt and determine which specialized agent should handle it.

Available agents:
- "chat": General conversation, Q&A, explanations, writing, brainstorming, analysis, advice, and anything not covered by other agents.
- "coding": Code generation, building apps/features/components, creating websites/pages, implementing logic, scripting, automation, debugging, code review, technical implementation, algorithms, software architecture, regex, SQL queries, configuration files.
- "search": Factual queries, current events, web research, real-time data, news, weather, stock prices, sports scores, looking up information.
- "pdf": Creating PDF documents, reports, invoices, certificates, forms, structured documents.
- "ppt": Creating PowerPoint presentations, slideshows, slide decks.
- "vision": Image analysis, image description, visual content understanding, OCR, analyzing uploaded images.

Examples:
User: "Build a simple calculator"
Agent: coding

User: "Explain quantum computing"
Agent: chat

User: "Write a Python script to sort files"
Agent: coding

User: "What is the weather in Tokyo?"
Agent: search

User: "Create a registration form with validation"
Agent: coding

User: "Make a PDF invoice template"
Agent: pdf

User: "What is the capital of France?"
Agent: chat

User: "Create a presentation about climate change"
Agent: ppt

Respond with ONLY the agent name in lowercase. No explanation, no markdown, no punctuation, no extra text.`

const VALID_AGENTS = ["chat", "coding", "search", "pdf", "ppt", "vision"]

export function extractAgent(text) {
    const lower = text.toLowerCase()
    for (const agent of VALID_AGENTS) {
        if (lower.includes(agent)) {
            return agent
        }
    }
    return null
}

export const commonAgent = async (state) => {
    const prompt = state.prompt?.trim()
    if (!prompt) {
        return { ...state, agent: "chat" }
    }

    const patternMatch = detectAgentByPattern(prompt)
    if (patternMatch) {
        return { ...state, agent: patternMatch }
    }

    const llm = await getModel()

    const response = await llm.invoke([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "human", content: prompt },
    ])

    const content = response.content?.trim() || ""

    const detectedAgent = extractAgent(content) || "chat"

    return {
        ...state,
        agent: detectedAgent,
    }
}
