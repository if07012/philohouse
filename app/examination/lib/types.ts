export type ExamQuestionType = "mcq_single" | "mcq_multi" | "fill_blank" | "essay";

export const EXAM_SHEETS = {
  materials: "Materials",
  questions: "ExamQuestions",
  exams: "Exams",
  submissions: "ExamSubmissions",
} as const;

export const MATERIAL_HEADERS = ["material_id", "title", "content"] as const;
export const EXAM_HEADERS = [
  "exam_id",
  "material_id",
  "material_title",
  "created_at",
] as const;
export const QUESTION_HEADERS = [
  "exam_id",
  "material_id",
  "question_id",
  "order_index",
  "type",
  "question_text",
  "options_json",
  "correct_answer",
  "explanation",
  "grading_reference",
] as const;

/** One row per final submission (answers + Groq evaluation snapshot). */
export const SUBMISSION_HEADERS = [
  "submission_id",
  "exam_id",
  "material_id",
  "submitted_at",
  "answers_json",
  "evaluation_json",
  "flagged_question_ids",
] as const;

export type MaterialRow = {
  material_id: string;
  title: string;
  content: string;
};

export type ExamMetaRow = {
  exam_id: string;
  material_id: string;
  material_title: string;
  created_at: string;
};

export type ExamQuestionRow = {
  exam_id: string;
  material_id: string;
  question_id: string;
  order_index: string;
  type: ExamQuestionType;
  question_text: string;
  options_json: string;
  correct_answer: string;
  explanation: string;
  grading_reference: string;
};

/** Sent to the client (no correct_answer / explanation / grading_reference until graded) */
export type PublicExamQuestion = {
  question_id: string;
  order_index: number;
  type: ExamQuestionType;
  question_text: string;
  options: string[];
};

export type EvaluationItem = {
  question_id: string;
  type: ExamQuestionType;
  correct: boolean | null;
  /** 0–100 for essay; null for non-essay */
  score_percent: number | null;
  feedback: string;
};
