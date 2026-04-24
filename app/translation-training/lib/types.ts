export type TranslationTrainingItem = {
  id: string;
  english: string;
  indonesian_reference: string;
  tags: string[];
};

export type TranslationEvalIssue = {
  /** The English source phrase that is problematic (or empty if global). */
  source_phrase: string;
  /** What the student wrote for that part (best-effort). */
  student_phrase: string;
  /** A suggested fix in Indonesian. */
  suggestion: string;
  /** Short reason in Indonesian. */
  reason: string;
  /** 1 (minor) to 3 (major). */
  severity: 1 | 2 | 3;
};

export type TranslationEvaluation = {
  score_percent: number; // 0..100
  overall_feedback: string;
  issues: TranslationEvalIssue[];
  /** Words/phrases the student should drill (Indonesian). */
  drill: { phrase: string; why: string }[];
};

export type TranslationAttempt = {
  attempt_id: string;
  item_id: string;
  english: string;
  student_indonesian: string;
  score_percent: number;
  overall_feedback: string;
  issues: TranslationEvalIssue[];
  drill: { phrase: string; why: string }[];
  created_at: string;
};

