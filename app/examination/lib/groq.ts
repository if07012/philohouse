import { getGroqApiKey, getGroqModel } from "./env";

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

export async function groqChatJson<T>(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getGroqModel(),
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ] satisfies GroqMessage[],
      temperature: 0.4,
      max_tokens: params.maxTokens ?? 8192,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("Groq returned empty content");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Groq returned non-JSON content");
  }
}
