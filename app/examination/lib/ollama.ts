import { getOllamaBaseUrl, getOllamaModel } from "./env";

type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

export async function ollamaChatJson<T>(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const base = getOllamaBaseUrl();
  const url = `${base}/v1/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ] satisfies OllamaMessage[],
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 12000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("Ollama returned empty content");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Ollama returned non-JSON content");
  }
}
