import type { ContentType } from "./types";

export type ImportAnswerInput = {
  id?: string;
  letter: string;
  type: ContentType;
  text: string;
  imageUrl: string;
  isCorrect?: any;
};

export type ImportQuestionInput = {
  id?: string;
  orderIndex?: number;
  type: ContentType;
  question: string;
  imageUrl: string;
  score: number;
  answers: ImportAnswerInput[];
};

const VALID_LETTERS = new Set(["A", "B", "C", "D", "E", "F"]);

function parseContentType(value: unknown): ContentType {
  const v = String(value ?? "text").toLowerCase();
  if (v === "image" || v === "mixed") return v;
  return "text";
}

function parseAnswer(raw: unknown): ImportAnswerInput | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const letter = String(a.letter ?? "").trim().toUpperCase();
  if (!letter || !VALID_LETTERS.has(letter)) return null;
  return {
    id: String(a.id ?? "").trim() || undefined,
    letter,
    type: parseContentType(a.type),
    text: String(a.text ?? ""),
    imageUrl: String(a.imageUrl ?? ""),
    isCorrect: a.isCorrect === undefined ? undefined : a.isCorrect,
  };
}

function parseQuestion(raw: unknown): ImportQuestionInput | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  if (!Array.isArray(q.answers) || q.answers.length < 2) return null;

  const answers = q.answers
    .map((a) => parseAnswer(a))
    .filter((a): a is ImportAnswerInput => a !== null);

  if (answers.length < 2 || answers.length > 6) return null;

  const letters = new Set(answers.map((a) => a.letter));
  if (letters.size !== answers.length) return null;

  const normalizedAnswers = answers.map((a, i) => ({
    ...a,
  }));

  return {
    id: String(q.id ?? "").trim() || undefined,
    orderIndex: q.orderIndex !== undefined ? Number(q.orderIndex) : undefined,
    type: parseContentType(q.type),
    question: String(q.question ?? ""),
    imageUrl: String(q.imageUrl ?? ""),
    score: Number(q.score ?? 0) || 0,
    answers: normalizedAnswers,
  };
}

export function parseImportQuestionsPayload(raw: unknown): ImportQuestionInput[] {
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { questions?: unknown[] }).questions)) {
    items = (raw as { questions: unknown[] }).questions;
  } else {
    throw new Error("Format JSON tidak valid. Harus berupa array soal atau { questions: [...] }.");
  }

  if (items.length === 0) {
    throw new Error("Tidak ada soal dalam JSON.");
  }

  const parsed = items.map(parseQuestion);
  const invalidIndex = parsed.findIndex((q) => q === null);
  if (invalidIndex >= 0) {
    throw new Error(
      `Soal #${invalidIndex + 1} tidak valid. Setiap soal butuh 2–6 jawaban dengan huruf A–F yang unik.`
    );
  }

  return parsed as ImportQuestionInput[];
}
