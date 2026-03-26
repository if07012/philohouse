import crypto from "crypto";
import { EXAM_GENERATION_COUNTS as COUNTS } from "./constants";
import type { ExamQuestionRow, MaterialRow } from "./types";
import { groqChatJson } from "./groq";

type GeneratedMcqSingle = {
  type: "mcq_single";
  question: string;
  hint: string;
  options: [string, string, string, string];
  correctLetter: "A" | "B" | "C" | "D";
  explanation: string;
};

type GeneratedMcqMulti = {
  type: "mcq_multi";
  question: string;
  hint: string;
  options: [string, string, string, string];
  correctLetters: ("A" | "B" | "C" | "D")[];
  explanation: string;
};

type GeneratedFill = {
  type: "fill_blank";
  question: string;
  hint: string;
  acceptableAnswers: string[];
  explanation: string;
};

type GeneratedEssay = {
  type: "essay";
  question: string;
  hint: string;
  modelAnswer: string;
  gradingReference: string;
  explanation: string;
};

type GenerationPayload = {
  mcq_single: GeneratedMcqSingle[];
  mcq_multi: GeneratedMcqMulti[];
  fill_blank: GeneratedFill[];
  essay: GeneratedEssay[];
};

function normalizeMaterial(m: Record<string, string>): MaterialRow | null {
  const material_id =
    m.material_id || m.Material_ID || m["Material ID"] || m.id || "";
  const title = m.title || m.Title || "";
  const content = m.content || m.Content || m.text || m.Text || "";
  const image_url =
    m.image_url ||
    m.imageUrl ||
    m.Image_URL ||
    m["Image URL"] ||
    m.image ||
    m.Image ||
    "";
  if (
    !String(material_id).trim() ||
    (!String(content).trim() && !String(image_url).trim())
  ) {
    return null;
  }
  return {
    material_id: String(material_id).trim(),
    title: String(title).trim() || "Untitled",
    content: String(content).trim(),
    image_url: String(image_url).trim(),
  };
}

export function parseMaterialRow(row: Record<string, string>): MaterialRow | null {
  return normalizeMaterial(row);
}

const GENERATION_SYSTEM = `You are an expert elementary curriculum writer. Output ONLY valid JSON matching the schema described in the user message. No markdown, no code fences.

Rules:
- All content must be appropriate for Grade 4 students (ages 9–10): clear vocabulary, short sentences, concrete examples.
- Questions must be based ONLY on the provided learning material. Do not invent facts not supported by the material.
- Multiple choice: exactly four options; one clearly best answer (single) or multiple correct (multi) as specified.
- Fill-in-the-blank: use a single blank marked as _____ in the question text. acceptableAnswers should include correct spellings and obvious variants (case-insensitive matching will be used later).
- Essay: prompts should be achievable in a short paragraph. modelAnswer is a concise exemplar; gradingReference lists 3–5 bullet criteria for grading.
- Every question must include "hint": one short clue (max 1 sentence) that points to the relevant part of the material without revealing the final answer directly.
- Variety: Each run must feel like a NEW exam. Mix recall, simple application, and light inference (still only from the material). Rotate which concepts you emphasize. If "Previously used question stems" appear, do NOT copy or lightly paraphrase them; ask about different details, use different angles, and fresh distractors while staying faithful to the material.`;

function buildGenerationUserPrompt(
  material: MaterialRow,
  priorQuestionTexts: string[],
  variationId: string
): string {
  const priorBlock =
    priorQuestionTexts.length === 0
      ? ""
      : `

Previously used question stems from older exams on this SAME material (do not repeat or near-duplicate these; teach additional facets of the material instead):
${priorQuestionTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}
`;

  return `Create an exam from this material. response in bahasa indonesia

Material title: ${material.title}

Material content:
---
${material.content}
---
${priorBlock}
Variation seed (for your internal diversity; output only the JSON schema below): ${variationId}

Make the hint:
- Do NOT be too general (avoid hints like "read the material again")
- ONLY use information from the material
- Add More explanation to make student easy to understand
- COPY information from the material but add some explanation to make sure student understand the answer
- Minimum 100 words
- Don't COPY the answer in the hint, but explain in another way

Return a JSON object with exactly these keys and array lengths:
- "mcq_single": array of length ${COUNTS.mcq_single}
- "mcq_multi": array of length ${COUNTS.mcq_multi}
- "fill_blank": array of length ${COUNTS.fill_blank}
- "essay": array of length ${COUNTS.essay}


Each mcq_single item:
{ "type": "mcq_single", "question": string, "hint": string, "options": [string,string,string,string], "correctLetter": "A"|"B"|"C"|"D", "explanation": string }

Each mcq_multi item (more than one correct):
{ "type": "mcq_multi", "question": string, "hint": string, "options": [string,string,string,string], "correctLetters": ["A","C"], "explanation": string }

Each fill_blank item:
{ "type": "fill_blank", "question": string (include _____), "hint": string, "acceptableAnswers": string[], "explanation": string }

Each essay item:
{ "type": "essay", "question": string, "hint": string, "modelAnswer": string, "gradingReference": string, "explanation": string }`;
}

function validatePayload(p: GenerationPayload): void {
  const keys: (keyof typeof COUNTS)[] = [
    "mcq_single",
    "mcq_multi",
    "fill_blank",
    "essay",
  ];
  for (const k of keys) {
    const arr = p[k];
    if (!Array.isArray(arr) || arr.length !== COUNTS[k]) {
      throw new Error(
        `Invalid generation: expected ${COUNTS[k]} items for ${k}, got ${Array.isArray(arr) ? arr.length : "non-array"}`
      );
    }
  }
}

function lettersToSortedKey(letters: string[]): string {
  return [...new Set(letters.map((l) => l.toUpperCase()))].sort().join(",");
}

function rowsFromPayload(
  examId: string,
  material: MaterialRow,
  payload: GenerationPayload
): ExamQuestionRow[] {
  const rows: ExamQuestionRow[] = [];
  let order = 1;

  const push = (r: Omit<ExamQuestionRow, "exam_id" | "material_id">) => {
    rows.push({
      exam_id: examId,
      material_id: material.material_id,
      ...r,
    });
  };

  for (const q of payload.mcq_single) {
    const question_id = crypto.randomUUID();
    push({
      question_id,
      order_index: String(order++),
      type: "mcq_single",
      question_text: q.question,
      hint_text: q.hint,
      options_json: JSON.stringify(q.options),
      correct_answer: q.correctLetter.toUpperCase(),
      explanation: q.explanation,
      grading_reference: "",
    });
  }

  for (const q of payload.mcq_multi) {
    const question_id = crypto.randomUUID();
    push({
      question_id,
      order_index: String(order++),
      type: "mcq_multi",
      question_text: q.question,
      hint_text: q.hint,
      options_json: JSON.stringify(q.options),
      correct_answer: lettersToSortedKey(q.correctLetters),
      explanation: q.explanation,
      grading_reference: "",
    });
  }

  for (const q of payload.fill_blank) {
    const question_id = crypto.randomUUID();
    push({
      question_id,
      order_index: String(order++),
      type: "fill_blank",
      question_text: q.question,
      hint_text: q.hint,
      options_json: "[]",
      correct_answer: JSON.stringify(q.acceptableAnswers),
      explanation: q.explanation,
      grading_reference: "",
    });
  }

  for (const q of payload.essay) {
    const question_id = crypto.randomUUID();
    push({
      question_id,
      order_index: String(order++),
      type: "essay",
      question_text: q.question,
      hint_text: q.hint,
      options_json: "[]",
      correct_answer: q.modelAnswer,
      explanation: q.explanation,
      grading_reference: q.gradingReference,
    });
  }

  return rows;
}

export async function generateExamQuestionRows(
  material: MaterialRow,
  priorQuestionTexts: string[] = []
): Promise<{ examId: string; rows: ExamQuestionRow[] }> {
  const variationId = crypto.randomUUID();
  const payload = await groqChatJson<GenerationPayload>({
    system: GENERATION_SYSTEM,
    user: buildGenerationUserPrompt(material, priorQuestionTexts, variationId),
    maxTokens: 12000,
    temperature: 0.82,
  });
  validatePayload(payload);
  const examId = crypto.randomUUID();
  const rows = rowsFromPayload(examId, material, payload);
  return { examId, rows };
}

