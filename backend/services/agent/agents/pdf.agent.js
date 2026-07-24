import { getModel } from "../config/llmModels.js";
import { generatePDF } from "../utils/pdfGenerator.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const pdfAgent = async (state) => {
    const prompt = state.prompt?.trim();
    if (!prompt) throw new Error("PDF prompt is required");

    const llm = await getModel("chat");

    const systemPrompt = `You are CortexAI, a professional document generation assistant.

## Rules
- Generate well-structured, professional content suitable for a PDF document.
- Use clear headings, sections, and bullet points.
- Start with a document title using a single # heading.
- Organize content with ## and ### section headings.
- Use numbered lists for sequential steps, bullet lists for features.
- Include a brief introduction and conclusion.
- Keep content comprehensive yet concise.
- Do NOT include code blocks or technical markdown formatting that is not suitable for a document.
- Use > for important callouts or summaries.
- Use --- to separate major sections.`;

    const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        { role: "human", content: prompt },
    ]);

    const markdown = response.content;
    const pdfBuffer = await generatePDF(markdown);

    const base64 = pdfBuffer.toString("base64");
    const dataUri = `data:application/pdf;base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
        resource_type: "raw",
        public_id: `cortex-pdfs/${Date.now()}`,
    });

    const intro = await llm.invoke([
        { role: "system", content: "You are a helpful assistant. Generate a short, natural 1-2 sentence message telling the user their document is ready. Be conversational and friendly. Do not use markdown or formatting. For example: \"I've finished creating your document. You can open it below.\" or \"Your PDF is ready. Use the button below to view it.\" Return ONLY the message, no quotes, no prefixes." },
        { role: "human", content: `The user asked to create a document about: ${prompt}` },
    ]);

    return {
        ...state,
        aiResponse: intro.content?.trim() || "I've created your document. You can open it below.",
        pdfUrl: result.secure_url,
    };
};
