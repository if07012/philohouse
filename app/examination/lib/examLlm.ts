import type { ExamLlmProvider } from "./env";
import { groqChatJson } from "./groq";
import { ollamaChatJson } from "./ollama";

type ChatJsonParams = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
};

export async function examLlmChatJson<T>(
  provider: ExamLlmProvider,
  params: ChatJsonParams
): Promise<T> {
  if (provider === "ollama") {
    return ollamaChatJson<T>(params);
  }
  return groqChatJson<T>(params);
}
