import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const visionAgent = async (state) => {
    const prompt = state.prompt?.trim();
    if (!prompt) throw new Error("Vision prompt is required");

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image",
        generationConfig: {
            responseModalities: ["Text", "Image"],
        },
    });

    const response = await model.generateContent(prompt);
    const parts = response.response.candidates?.[0]?.content?.parts || [];

    let imageData = null;
    let imageMimeType = "image/png";
    let textResponse = "";

    for (const part of parts) {
        if (part.inlineData) {
            imageData = part.inlineData.data;
            imageMimeType = part.inlineData.mimeType;
        }
        if (part.text) {
            textResponse += part.text;
        }
    }

    if (!imageData) {
        throw new Error("No image was generated. The model returned text only.");
    }

    const dataUri = `data:${imageMimeType};base64,${imageData}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
        resource_type: "image",
        public_id: `cortex-images/${Date.now()}`,
    });

    if (!uploadResult?.secure_url) {
        throw new Error("Image upload to Cloudinary failed");
    }

    return {
        ...state,
        aiResponse: textResponse || "Image generated successfully",
        imageUrl: uploadResult.secure_url,
    };
};
