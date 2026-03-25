import type { EvaluationItem, PublicExamQuestion } from "./types";

const STORAGE_VERSION = 1 as const;

export type ExamPersistedState = {
  version: typeof STORAGE_VERSION;
  examId: string;
  answers: Record<string, string>;
  /** Serialized multi-select as sorted comma letters e.g. "A,C" */
  multiAnswers: Record<string, string>;
  flagged: Record<string, boolean>;
  hintUsed?: Record<string, boolean>;
  currentIndex: number;
  submitted: boolean;
  submissionId?: string;
  results?: {
    evaluation: EvaluationItem[];
    explanations: Record<string, string>;
  };
};

export function storageKeyForExam(examId: string): string {
  return `grade4-exam-v${STORAGE_VERSION}-${examId}`;
}

export function loadExamState(examId: string): ExamPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKeyForExam(examId));
    if (!raw) return null;
    const p = JSON.parse(raw) as ExamPersistedState;
    if (p?.version !== STORAGE_VERSION || p.examId !== examId) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveExamState(state: ExamPersistedState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKeyForExam(state.examId), JSON.stringify(state));
}

export function clearExamState(examId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKeyForExam(examId));
}

export function buildPersistedState(params: {
  examId: string;
  answers: Record<string, string>;
  multiSelections: Record<string, Set<string>>;
  flagged: Record<string, boolean>;
  hintUsed?: Record<string, boolean>;
  currentIndex: number;
  submitted: boolean;
  submissionId?: string;
  results?: ExamPersistedState["results"];
}): ExamPersistedState {
  const multiAnswers: Record<string, string> = {};
  for (const [k, set] of Object.entries(params.multiSelections)) {
    multiAnswers[k] = [...set].sort().join(",");
  }
  return {
    version: STORAGE_VERSION,
    examId: params.examId,
    answers: params.answers,
    multiAnswers,
    flagged: params.flagged,
    hintUsed: params.hintUsed ?? {},
    currentIndex: params.currentIndex,
    submitted: params.submitted,
    submissionId: params.submissionId,
    results: params.results,
  };
}

export function createFreshState(examId: string): ExamPersistedState {
  return {
    version: STORAGE_VERSION,
    examId,
    answers: {},
    multiAnswers: {},
    flagged: {},
    hintUsed: {},
    currentIndex: 0,
    submitted: false,
  };
}

export function multiSelectionsFromState(
  multiAnswers: Record<string, string>
): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const [qid, csv] of Object.entries(multiAnswers)) {
    const set = new Set<string>();
    for (const part of csv.split(",")) {
      const t = part.trim().toUpperCase();
      if (t) set.add(t);
    }
    out[qid] = set;
  }
  return out;
}

export function mergeMultiIntoAnswers(
  questions: PublicExamQuestion[],
  answers: Record<string, string>,
  multiAnswers: Record<string, string>
): Record<string, string> {
  const out = { ...answers };
  for (const q of questions) {
    if (q.type === "mcq_multi") {
      out[q.question_id] = multiAnswers[q.question_id] ?? "";
    }
  }
  return out;
}

export function hasAnswerForQuestion(
  q: PublicExamQuestion,
  answers: Record<string, string>,
  multiSelections: Record<string, Set<string>>
): boolean {
  if (q.type === "mcq_single") {
    return Boolean((answers[q.question_id] ?? "").trim());
  }
  if (q.type === "mcq_multi") {
    return (multiSelections[q.question_id]?.size ?? 0) > 0;
  }
  return Boolean((answers[q.question_id] ?? "").trim());
}
