import { getModel } from "../config/llmModels.js"


export const router = async (state) => {
    const llm = await await getModel("router")

    const prompt = `You are an agent router.
    
    Available agents:

    - chat
    - search
    - coding
    - pdf
    - ppt
    - vision

    Rules:

    chat:
    General conversation,
    explainations,
    learning,
    questions.

    search:
    Current events, 
    latest information,
    news,
    recent development,
    internet lookup.

    coding:
    Generate code,
    debug code,
    build projects,
    architecture,
    API design.

    pdf:
    Questions about generate PDFs or document context.

    ppt: 
    Questions about generaye ppts 
    or ppt context.

    vision:
    Generate image,
    create image



    return Only one world:

    chat
    search
    coding
    pdf
    ppt
    vision


    User Query: 
    ${state.prompt}
    `

    const response = await llm.invoke(prompt)
    console.log(response);

    return {
        ...state,
        agent: response.content
        .trim()
        .toLowerCase()
    }

}