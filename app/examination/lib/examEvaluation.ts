import type { EvaluationItem, ExamQuestionRow, ExamQuestionType } from "./types";
import { groqChatJson } from "./groq";

type BatchResult = {
  results: {
    question_id: string;
    correct: boolean | null;
    score_percent: number | null;
    feedback: string;
  }[];
};

const EVAL_SYSTEM = `You are a fair Grade 4 teacher assistant. You evaluate student answers against the provided correct information.

Rules:
- For mcq_single: student answer is a single letter A–D. Compare to the correct letter (case-insensitive). correct is true only if it matches.
- For mcq_multi: correct_answer is a comma-separated sorted list of letters (e.g. "A,C"). Normalize student answer to the same format (split by comma, trim, uppercase, sort, join). correct is true only if sets match exactly.
- For fill_blank: correct_answer is a JSON array of acceptable strings. Student text should be trimmed; comparison is case-insensitive to any acceptable answer. correct is true if it matches any acceptable answer semantically close enough for Grade 4 (allow minor spelling errors if meaning is clear).
- For essay: score_percent is an integer 0–100 based on how well the answer meets grading_reference and aligns with modelAnswer. correct is true if score_percent >= 70, else false.

Output ONLY valid JSON: { "results": [ { "question_id", "correct": boolean|null, "score_percent": number|null, "feedback": string } ] }
Use score_percent null for non-essay types. For non-essay, correct must be boolean.
Keep feedback short and encouraging, suitable for Grade 4. and send feedback in bahasa indonesia`;

function buildEvalUserPayload(
  materialTitle: string,
  materialContent: string,
  items: {
    row: ExamQuestionRow;
    studentAnswer: string;
  }[]
): string {
  const simplified = items.map(({ row, studentAnswer }) => {
    let options: string[] = [];
    try {
      const o = JSON.parse(row.options_json || "[]");
      options = Array.isArray(o) ? o.map(String) : [];
    } catch {
      options = [];
    }
    return {
    question_id: row.question_id,
    type: row.type as ExamQuestionType,
    question_text: row.question_text,
    options,
    correct_answer: row.correct_answer,
    grading_reference: row.grading_reference || "",
    model_answer_essay: row.type === "essay" ? row.correct_answer : "",
    student_answer: studentAnswer,
  };
  });

  return `Material title: ${materialTitle}

Material content (for context):
---
${materialContent.slice(0, 8000)}
---

Evaluate each item. Return JSON with key "results" — same length and order as below.

Items:
${JSON.stringify(simplified, null, 2)}`;
}

export async function evaluateAnswers(params: {
  materialTitle: string;
  materialContent: string;
  items: { row: ExamQuestionRow; studentAnswer: string }[];
}): Promise<EvaluationItem[]> {
  if (params.items.length === 0) return [];

  const parsed = await groqChatJson<BatchResult>({
    system: EVAL_SYSTEM,
    user: buildEvalUserPayload(
      params.materialTitle,
      params.materialContent,
      params.items
    ),
    maxTokens: 4096,
  });

  if (!parsed.results || !Array.isArray(parsed.results)) {
    throw new Error("Invalid evaluation response");
  }

  const byId = new Map(parsed.results.map((r) => [r.question_id, r]));
  return params.items.map(({ row, studentAnswer }) => {
    const r = byId.get(row.question_id);
    if (!r) {
      return {
        question_id: row.question_id,
        type: row.type as ExamQuestionType,
        correct: null,
        score_percent: null,
        feedback: "Could not evaluate this question.",
      };
    }
    let score_percent: number | null = r.score_percent;
    if (row.type !== "essay") {
      score_percent = null;
    } else if (typeof score_percent !== "number" || Number.isNaN(score_percent)) {
      score_percent = 0;
    } else {
      score_percent = Math.max(0, Math.min(100, Math.round(score_percent)));
    }
    return {
      question_id: row.question_id,
      type: row.type as ExamQuestionType,
      correct:
        typeof r.correct === "boolean"
          ? r.correct
          : row.type === "essay"
            ? score_percent !== null && score_percent >= 70
            : null,
      score_percent,
      feedback: String(r.feedback || "").slice(0, 2000),
    };
  });
}
