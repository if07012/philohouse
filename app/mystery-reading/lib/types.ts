/** Google Sheet tab names */
export const MYSTERY_SHEETS = {
  daily: "MysteryDaily",
  quiz: "MysteryQuiz",
  families: "MysteryFamilies",
  children: "MysteryChildren",
  attempts: "MysteryAttempts",
} as const;

export const DAILY_HEADERS = [
  "story_date",
  "title",
  "summary",
  "content_md",
  "clues_json",
  "characters_json",
  "image_prompt",
  "image_url",
  "difficulty_band",
  "generated_at",
  "openai_model",
] as const;

export const QUIZ_HEADERS = ["story_date", "questions_json", "created_at"] as const;

export const FAMILY_HEADERS = [
  "family_id",
  "parent_label",
  "pin_hash",
  "created_at",
] as const;

export const CHILD_HEADERS = [
  "child_id",
  "family_id",
  "nickname",
  "xp",
  "level",
  "current_streak",
  "longest_streak",
  "last_completed_date",
  "badges_json",
  "rolling_avg_score",
] as const;

export const ATTEMPT_HEADERS = [
  "attempt_id",
  "child_id",
  "story_date",
  "answers_json",
  "per_question_results_json",
  "score_percent",
  "xp_awarded",
  "completed_at",
] as const;

export type QuizKind =
  | "fact"
  | "inference"
  | "logic"
  | "sequence"
  | "moral";

export type MysteryQuizQuestion = {
  question_id: string;
  kind: QuizKind;
  question: string;
  options: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
  explanation: string;
};

/** Sent to client (no answer key) */
export type PublicMysteryQuizQuestion = {
  question_id: string;
  kind: QuizKind;
  question: string;
  options: [string, string, string, string];
};

export type PerQuestionResult = {
  question_id: string;
  kind: QuizKind;
  correct: boolean;
};

export type CharacterBrief = { name: string; role: string };

export type MysteryDailyPayload = {
  story_date: string;
  title: string;
  summary: string;
  content_md: string;
  clues: string[];
  characters: CharacterBrief[];
  image_prompt: string;
  image_url: string;
  difficulty_band: string;
  generated_at: string;
  openai_model: string;
};
