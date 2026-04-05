import crypto from "crypto";
import { EXAM_GENERATION_COUNTS as COUNTS } from "./constants";
import { getExamLlmProvider, type ExamLlmProvider } from "./env";
import { examLlmChatJson } from "./examLlm";
import type { ExamQuestionRow, MaterialRow } from "./types";

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
- Every question must include "hint" as specified in the user message (substantive, from the material, without giving away the final answer).
- Uniqueness vs this material_id: The user message lists every existing "question" stem already generated for this same material_id (from older exams). Before you finish, mentally check EACH new item's "question" string against that list (ignore only case differences and extra spaces when comparing).
- NEVER output a "question" that is 100% identical to any listed stem after that normalization. If you need to assess the same idea again, you MUST change the stem: different wording, word order, scenario, or question type angle; MCQ options and distractors must be new, not copied from old exams.
- Bans: no copy-paste from the list; no trivial edits only (synonym swap while keeping the same sentence frame counts as too similar). Aim for clearly different phrasing every generation run.
- Variety: Each run must feel like a NEW exam. Mix recall, simple application, and light inference (still only from the material). Rotate which concepts you emphasize; when many prior stems exist, prefer topics and angles not already exhausted in the list.`;

function buildGenerationUserPrompt(
  material: MaterialRow,
  priorQuestionTexts: string[],
  variationId: string
): string {
  const priorBlock =
    priorQuestionTexts.length === 0
      ? `

No prior exam questions are stored yet for this material_id ("${material.material_id}"). Still write wholly new stems (do not reuse canned templates across imaginary runs); later generations will be checked against this exam.
`
      : `

--- Existing questions for this SAME material_id ("${material.material_id}") ---
The numbered list below is every question stem already used in older exams for this material. You MUST treat it as the deduplication source of truth.

Hard requirements:
1) For every new item, the "question" text must NOT be an exact match to any line below (after trimming and collapsing internal whitespace; case-insensitive OK to compare).
2) Do not produce near-duplicates: if a new stem would answer the same narrow fact as an old one, rephrase so the sentence structure and framing are clearly different; for MCQ, change all four options, not only the stem.
3) Prefer new subtopics or angles from the material that do not appear in the list; only revisit a similar learning goal if you fully reword the task.

Prior stems (${priorQuestionTexts.length} total):
${priorQuestionTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}
---
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

/** Google Sheets cells must be scalars; the API rejects list_value for plain columns. */
function sheetCellString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => sheetCellString(v))
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
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
    const opts = Array.isArray(q.options) ? q.options : [];
    push({
      question_id,
      order_index: String(order++),
      type: "mcq_single",
      question_text: sheetCellString(q.question),
      hint_text: sheetCellString(q.hint),
      options_json: JSON.stringify(opts.map((o) => sheetCellString(o))),
      correct_answer: String(q.correctLetter ?? "")
        .trim()
        .toUpperCase()
        .slice(0, 1) || "?",
      explanation: sheetCellString(q.explanation),
      grading_reference: "",
    });
  }

  for (const q of payload.mcq_multi) {
    const question_id = crypto.randomUUID();
    const opts = Array.isArray(q.options) ? q.options : [];
    const letters = Array.isArray(q.correctLetters) ? q.correctLetters : [];
    push({
      question_id,
      order_index: String(order++),
      type: "mcq_multi",
      question_text: sheetCellString(q.question),
      hint_text: sheetCellString(q.hint),
      options_json: JSON.stringify(opts.map((o) => sheetCellString(o))),
      correct_answer: lettersToSortedKey(letters.map((l) => String(l))),
      explanation: sheetCellString(q.explanation),
      grading_reference: "",
    });
  }

  for (const q of payload.fill_blank) {
    const question_id = crypto.randomUUID();
    const answers = Array.isArray(q.acceptableAnswers)
      ? q.acceptableAnswers.map((a) => sheetCellString(a)).filter(Boolean)
      : [sheetCellString(q.acceptableAnswers)].filter(Boolean);
    push({
      question_id,
      order_index: String(order++),
      type: "fill_blank",
      question_text: sheetCellString(q.question),
      hint_text: sheetCellString(q.hint),
      options_json: "[]",
      correct_answer: JSON.stringify(answers.length ? answers : [""]),
      explanation: sheetCellString(q.explanation),
      grading_reference: "",
    });
  }

  for (const q of payload.essay) {
    const question_id = crypto.randomUUID();
    push({
      question_id,
      order_index: String(order++),
      type: "essay",
      question_text: sheetCellString(q.question),
      hint_text: sheetCellString(q.hint),
      options_json: "[]",
      correct_answer: sheetCellString(q.modelAnswer),
      explanation: sheetCellString(q.explanation),
      grading_reference: sheetCellString(q.gradingReference),
    });
  }

  return rows;
}

export async function generateExamQuestionRows(
  material: MaterialRow,
  priorQuestionTexts: string[] = [],
  options?: { llmProvider?: ExamLlmProvider }
): Promise<{ examId: string; rows: ExamQuestionRow[] }> {
  const provider = options?.llmProvider ?? getExamLlmProvider();
  const variationId = crypto.randomUUID();
  const payload = await examLlmChatJson<GenerationPayload>(provider, {
    system: GENERATION_SYSTEM,
    user: buildGenerationUserPrompt(material, priorQuestionTexts, variationId),
    maxTokens: 8000,
    temperature: 0.82,
  });
  validatePayload(payload);
  const examId = crypto.randomUUID();
  const rows = rowsFromPayload(examId, material, payload);
  return { examId, rows };
}

