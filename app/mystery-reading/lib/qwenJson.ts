import OpenAI from "openai";
import { getQwenApiKey, getQwenModel, getQwenBaseUrl } from "./mysteryEnv";

export function getQwenClient(): OpenAI {
  return new OpenAI({ 
    apiKey: getQwenApiKey(),
    baseURL: getQwenBaseUrl()
  });
}

export async function qwenChatJson<T>(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = getQwenClient();
  const model = getQwenModel();
  const completion = await client.chat.completions.create({
    model,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Qwen returned empty content");
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Qwen returned non-JSON content");
  }
}
