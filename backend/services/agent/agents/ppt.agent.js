import { getModel } from "../config/llmModels.js";
import { generatePPT } from "../utils/pptGenerator.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const pptAgent = async (state) => {
    const prompt = state.prompt?.trim();
    if (!prompt) throw new Error("PPT prompt is required");

    const llm = await getModel("chat");

    const systemPrompt = `You are CortexAI, a presentation content creator specializing in slide-ready content.

## Rules
- Generate content structured for presentation slides.
- Start with a single # heading for the presentation title.
- Each slide should have: a title (## Slide N: Title), key bullet points, and speaker notes in italics (_like this_).
- Keep slide content concise — max 5-6 bullets per slide.
- Use consistent formatting across all slides.
- Include an opening title slide and a closing summary slide.
- Recommend slide count (typically 5-10 slides).
- Use markdown formatting.`;

    const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        { role: "human", content: prompt },
    ]);

    const markdown = response.content;
    const pptBuffer = await generatePPT(markdown);

    const base64 = pptBuffer.toString("base64");
    const dataUri = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`;

    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
        resource_type: "raw",
        public_id: `cortex-ppts/${Date.now()}.pptx`,
    });

    if (!uploadResponse?.secure_url) {
        throw new Error("PPT upload to Cloudinary failed - no URL returned");
    }

    const intro = await llm.invoke([
        { role: "system", content: "You are a helpful assistant. Generate a short, natural 1-2 sentence message telling the user their presentation is ready. Be conversational and friendly. Do not use markdown or formatting. For example: \"I've finished creating your presentation. You can open it below.\" or \"Your slides are ready. Click the button below to view them.\" Return ONLY the message, no quotes, no prefixes." },
        { role: "human", content: `The user asked to create a presentation about: ${prompt}` },
    ]);

    return {
        ...state,
        aiResponse: intro.content?.trim() || "I've created your presentation. You can open it below.",
        pptUrl: uploadResponse.secure_url,
    };
};