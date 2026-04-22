import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { generateImage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getOpenAIApiKey, getOpenAIImageModel } from "./mysteryEnv";

/**
 * Generate cover via AI SDK `generateImage` and save it under
 * `public/mystery-reading/covers/`.
 */
export async function generateAiSdkCoverToPublic(params: {
  promptEn: string;
  storyDate: string;
}): Promise<string | null> {
  try {
    const provider = createOpenAI({ apiKey: getOpenAIApiKey() });
    const modelId = getOpenAIImageModel();

    const { image } = await generateImage({
      model: provider.image(modelId),
      prompt: params.promptEn,
      size: "1536x1024",
      providerOptions: {
        openai: {
          quality: "high",
        },
      },
      maxRetries: 1,
    });

    const ct = image.mediaType || "image/png";
    const ext = ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : "png";
    const slug = params.storyDate.replace(/[^0-9-]/g, "") || "cover";
    const filename = `${slug}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const absDir = path.join(process.cwd(), "public", "mystery-reading", "covers");
    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(path.join(absDir, filename), Buffer.from(image.uint8Array));
    return `/mystery-reading/covers/${filename}`;
  } catch (e) {
    console.error("AI SDK image generation failed:", e);
    return null;
  }
}
