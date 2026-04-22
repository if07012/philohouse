import OpenAI from "openai";
import { getOpenAIApiKey, getOpenAIModel } from "./mysteryEnv";

export function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getOpenAIApiKey() });
}

export async function openaiChatJson<T>(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
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
  if (!raw) throw new Error("OpenAI returned empty content");
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }
}
