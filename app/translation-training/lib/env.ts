import { parseExamLlmProvider } from "@/app/examination/lib/env";

export function getTranslationSpreadsheetId(): string {
  const id =
    process.env.TRANSLATION_TRAINING_SPREADSHEET_ID?.trim() ||
    process.env.TRANSLATION_SPREADSHEET_ID?.trim() ||
    process.env.QUESTIONS_SHEET_ID?.trim() ||
    process.env.QUIZ_SHEET_ID?.trim() ||
    "";
  if (!id) {
    throw new Error(
      "Missing TRANSLATION_TRAINING_SPREADSHEET_ID (or TRANSLATION_SPREADSHEET_ID / QUESTIONS_SHEET_ID / QUIZ_SHEET_ID)"
    );
  }
  return id;
}

export function getTranslationSheetName(): string {
  return process.env.TRANSLATION_TRAINING_SHEET_NAME?.trim() || "Translation-EN-ID";
}

/** Sheet tab that lists source material; column "Material" (or fallbacks) is read for themes. */
export function getMaterialListSheetName(): string {
  return process.env.TRANSLATION_MATERIAL_LIST_SHEET_NAME?.trim() || "List Material";
}

export function getTranslationAttemptSheetName(): string {
  return (
    process.env.TRANSLATION_TRAINING_ATTEMPT_SHEET_NAME?.trim() ||
    "Translation-EN-ID-Attempts"
  );
}

export type TranslationLlmProvider = "groq" | "ollama";

export function getTranslationLlmProvider(): TranslationLlmProvider {
  const v =
    process.env.TRANSLATION_TRAINING_LLM_PROVIDER?.trim() ||
    process.env.EXAM_LLM_PROVIDER?.trim() ||
    "groq";
  const parsed = parseExamLlmProvider(v);
  return parsed === "ollama" ? "ollama" : "groq";
}

