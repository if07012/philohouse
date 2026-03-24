import {
  appendSheetData,
  ensureSheetWithHeaders,
  readSheetData,
} from "@/app/lib/googleSheets";
import {
  EXAM_HEADERS,
  EXAM_SHEETS,
  MATERIAL_HEADERS,
  QUESTION_HEADERS,
  SUBMISSION_HEADERS,
  type ExamMetaRow,
  type ExamQuestionRow,
  type MaterialRow,
  type PublicExamQuestion,
} from "./types";
import { parseMaterialRow } from "./examGeneration";

export async function listMaterials(spreadsheetId: string): Promise<MaterialRow[]> {
  const rows = await readSheetData(spreadsheetId, EXAM_SHEETS.materials);
  const out: MaterialRow[] = [];
  for (const r of rows) {
    const m = parseMaterialRow(r as Record<string, string>);
    if (m) out.push(m);
  }
  return out;
}

export async function findMaterial(
  spreadsheetId: string,
  materialId: string
): Promise<MaterialRow | null> {
  const list = await listMaterials(spreadsheetId);
  return list.find((m) => m.material_id === materialId) ?? null;
}

export async function ensureExamSheets(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(
    spreadsheetId,
    EXAM_SHEETS.materials,
    [...MATERIAL_HEADERS]
  );
  await ensureSheetWithHeaders(
    spreadsheetId,
    EXAM_SHEETS.exams,
    [...EXAM_HEADERS]
  );
  await ensureSheetWithHeaders(
    spreadsheetId,
    EXAM_SHEETS.questions,
    [...QUESTION_HEADERS]
  );
  await ensureSheetWithHeaders(
    spreadsheetId,
    EXAM_SHEETS.submissions,
    [...SUBMISSION_HEADERS]
  );
}

export type ExamSubmissionSheetRow = {
  submission_id: string;
  exam_id: string;
  material_id: string;
  submitted_at: string;
  answers_json: string;
  evaluation_json: string;
  flagged_question_ids: string;
};

export async function appendExamSubmission(
  spreadsheetId: string,
  row: ExamSubmissionSheetRow
): Promise<void> {
  await appendSheetData(
    spreadsheetId,
    [row as unknown as Record<string, unknown>],
    EXAM_SHEETS.submissions
  );
}

export async function findSubmissionById(
  spreadsheetId: string,
  submissionId: string
): Promise<ExamSubmissionSheetRow | null> {
  const rows = await readSheetData(spreadsheetId, EXAM_SHEETS.submissions);
  const r = (rows as Record<string, string>[]).find(
    (row) => row.submission_id === submissionId
  );
  if (!r?.submission_id) return null;
  return {
    submission_id: r.submission_id,
    exam_id: r.exam_id || "",
    material_id: r.material_id || "",
    submitted_at: r.submitted_at || "",
    answers_json: r.answers_json || "{}",
    evaluation_json: r.evaluation_json || "{}",
    flagged_question_ids: r.flagged_question_ids || "[]",
  };
}

export async function appendExamMeta(
  spreadsheetId: string,
  meta: ExamMetaRow
): Promise<void> {
  await appendSheetData(
    spreadsheetId,
    [meta as unknown as Record<string, unknown>],
    EXAM_SHEETS.exams
  );
}

export async function appendQuestionRows(
  spreadsheetId: string,
  rows: ExamQuestionRow[]
): Promise<void> {
  if (rows.length === 0) return;
  await appendSheetData(
    spreadsheetId,
    rows as unknown as Record<string, unknown>[],
    EXAM_SHEETS.questions
  );
}

export async function listExams(spreadsheetId: string): Promise<ExamMetaRow[]> {
  const rows = await readSheetData(spreadsheetId, EXAM_SHEETS.exams);
  return (rows as Record<string, string>[])
    .filter((r) => r.exam_id)
    .map((r) => ({
      exam_id: r.exam_id,
      material_id: r.material_id || "",
      material_title: r.material_title || "",
      created_at: r.created_at || "",
    }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/** Cap how many prior question stems we send to the model (token budget). */
const MAX_PRIOR_QUESTION_TEXTS_FOR_GENERATION = 48;

/**
 * Question stems from previous exams for this material (newest exams first),
 * deduped so generation prompts stay smaller. Used to ask the LLM for non-repetitive items.
 */
export async function listPriorQuestionTextsForMaterial(
  spreadsheetId: string,
  materialId: string
): Promise<string[]> {
  const exams = await listExams(spreadsheetId);
  const examIdsForMaterial = exams
    .filter((e) => e.material_id === materialId)
    .map((e) => e.exam_id);
  if (examIdsForMaterial.length === 0) return [];

  const examOrder = new Map(examIdsForMaterial.map((id, i) => [id, i]));
  const rows = await readSheetData(spreadsheetId, EXAM_SHEETS.questions);
  const forMaterial = (rows as Record<string, string>[]).filter(
    (r) => r.material_id === materialId && examOrder.has(r.exam_id)
  );
  forMaterial.sort((a, b) => {
    const oa = examOrder.get(a.exam_id) ?? 999;
    const ob = examOrder.get(b.exam_id) ?? 999;
    if (oa !== ob) return oa - ob;
    return Number(a.order_index || 0) - Number(b.order_index || 0);
  });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of forMaterial) {
    const t = (r.question_text || "").trim();
    if (!t) continue;
    const key = t.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_PRIOR_QUESTION_TEXTS_FOR_GENERATION) break;
  }
  return out;
}

export async function loadQuestionsForExam(
  spreadsheetId: string,
  examId: string
): Promise<ExamQuestionRow[]> {
  const rows = await readSheetData(spreadsheetId, EXAM_SHEETS.questions);
  const filtered = (rows as Record<string, string>[]).filter(
    (r) => r.exam_id === examId
  );
  return filtered
    .map((r) => ({
      exam_id: r.exam_id,
      material_id: r.material_id || "",
      question_id: r.question_id,
      order_index: r.order_index || "0",
      type: r.type as ExamQuestionRow["type"],
      question_text: r.question_text || "",
      options_json: r.options_json || "[]",
      correct_answer: r.correct_answer || "",
      explanation: r.explanation || "",
      grading_reference: r.grading_reference || "",
    }))
    .sort(
      (a, b) => Number(a.order_index) - Number(b.order_index)
    ) as ExamQuestionRow[];
}

export function toPublicQuestions(rows: ExamQuestionRow[]): PublicExamQuestion[] {
  return rows.map((r) => {
    let options: string[] = [];
    try {
      const parsed = JSON.parse(r.options_json || "[]");
      options = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      options = [];
    }
    return {
      question_id: r.question_id,
      order_index: Number(r.order_index) || 0,
      type: r.type,
      question_text: r.question_text,
      options,
    };
  });
}
