export function getGrade4ExamSpreadsheetId(): string {
  const id =
    process.env.GRADE4_EXAM_SPREADSHEET_ID ||
    process.env.EXAM_SPREADSHEET_ID ||
    "";
  if (!id) {
    throw new Error(
      "Missing GRADE4_EXAM_SPREADSHEET_ID (or EXAM_SPREADSHEET_ID) environment variable"
    );
  }
  return id;
}

export function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY || "";
  if (!key) {
    throw new Error("Missing GROQ_API_KEY environment variable");
  }
  return key;
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
}

export type ExamLlmProvider = "groq" | "ollama";

export function getExamLlmProvider(): ExamLlmProvider {
  const v = (process.env.EXAM_LLM_PROVIDER || "groq").trim().toLowerCase();
  return v === "ollama" ? "ollama" : "groq";
}

export function parseExamLlmProvider(value: unknown): ExamLlmProvider | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "groq" || v === "ollama") return v;
  return null;
}

/** Base URL only, e.g. http://127.0.0.1:11434 — /v1/chat/completions is appended. */
export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
    /\/$/,
    ""
  );
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || "llama3.2";
}
