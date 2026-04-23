import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { generateImage } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { getGatewayApiKey, getGatewayBaseUrl } from "./mysteryEnv";

/**
 * Generate cover via AI SDK `generateImage` using ByteDance Seedream
 * and save it under `public/mystery-reading/covers/`.
 */
export async function generateAiSdkCoverToPublic(params: {
  promptEn: string;
  storyDate: string;
}): Promise<string | null> {
  try {
    const provider = createGateway({
      apiKey: getGatewayApiKey(),
      baseURL: getGatewayBaseUrl(),
    });
    const modelId = "bytedance/seedream-5.0-lite";

    const { image } = await generateImage({
      model: provider.image(modelId),
      prompt: params.promptEn,
      size: "1536x1024",
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
