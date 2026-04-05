import type { ExamQuestionRow } from "./types";

function normalizeLetterCsv(csv: string): string {
  return csv
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

/**
 * Immediate correctness for take flow (no LLM). Essay: non-empty passes so student can continue.
 */
export function checkStudentAnswer(
  row: ExamQuestionRow,
  studentAnswer: string
): { correct: boolean } {
  const raw = studentAnswer.trim();
  switch (row.type) {
    case "mcq_single": {
      const expected = (row.correct_answer || "").trim().toUpperCase().slice(0, 1);
      const got = raw.toUpperCase().slice(0, 1);
      if (!got || !expected) return { correct: false };
      return { correct: got === expected };
    }
    case "mcq_multi": {
      const expected = normalizeLetterCsv(row.correct_answer || "");
      const got = normalizeLetterCsv(raw);
      if (!got || !expected) return { correct: false };
      return { correct: got === expected };
    }
    case "fill_blank": {
      if (!raw) return { correct: false };
      let acceptable: string[] = [];
      try {
        const p = JSON.parse(row.correct_answer || "[]");
        acceptable = Array.isArray(p) ? p.map((x) => String(x).trim()) : [];
      } catch {
        acceptable = [];
      }
      const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
      const nr = norm(raw);
      const ok = acceptable.some((a) => norm(a) === nr);
      return { correct: ok };
    }
    case "essay": {
      return { correct: raw.length > 0 };
    }
    default:
      return { correct: false };
  }
}
