export type ContentType = "text" | "image" | "mixed";

export type AttemptStatus = "completed" | "timeout";

export const QUIZ_SHEETS = {
  quiz: "Quiz",
  questions: "Questions",
  answers: "Answers",
  users: "Users",
  attempts: "QuizAttempts",
  userAnswers: "UserAnswers",
} as const;

export const QUIZ_HEADERS = [
  "id",
  "title",
  "description",
  "duration",
  "passingScore",
  "active",
  "createdAt",
] as const;

export const QUESTION_HEADERS = [
  "id",
  "quizId",
  "orderIndex",
  "type",
  "question",
  "imageUrl",
  "score",
] as const;

export const ANSWER_HEADERS = [
  "id",
  "questionId",
  "letter",
  "type",
  "text",
  "imageUrl",
  "isCorrect",
] as const;

export const USER_HEADERS = ["id", "name", "createdAt"] as const;

export const ATTEMPT_HEADERS = [
  "id",
  "userId",
  "quizId",
  "startTime",
  "finishTime",
  "durationSec",
  "score",
  "correct",
  "wrong",
  "passed",
  "status",
] as const;

export const USER_ANSWER_HEADERS = [
  "id",
  "attemptId",
  "questionId",
  "selectedAnswerId",
  "selectedLetter",
  "correct",
] as const;

export type QuizRow = {
  id: string;
  title: string;
  description: string;
  duration: number;
  passingScore: number;
  active: boolean;
  createdAt: string;
};

export type QuestionRow = {
  id: string;
  quizId: string;
  orderIndex: number;
  type: ContentType;
  question: string;
  imageUrl: string;
  score: number;
};

export type AnswerRow = {
  id: string;
  questionId: string;
  letter: string;
  type: ContentType;
  text: string;
  imageUrl: string;
  isCorrect: boolean;
};

export type UserRow = {
  id: string;
  name: string;
  createdAt: string;
};

export type AttemptRow = {
  id: string;
  userId: string;
  quizId: string;
  startTime: string;
  finishTime: string;
  durationSec: number;
  score: number;
  correct: number;
  wrong: number;
  passed: boolean;
  status: AttemptStatus;
};

export type UserAnswerRow = {
  id: string;
  attemptId: string;
  questionId: string;
  selectedAnswerId: string;
  selectedLetter: string;
  correct: boolean;
};

/** Sent to client — no isCorrect on answers */
export type PublicAnswer = {
  id: string;
  letter: string;
  type: ContentType;
  text: string;
  imageUrl: string;
};

export type PublicQuestion = {
  id: string;
  orderIndex: number;
  type: ContentType;
  question: string;
  imageUrl: string;
  score: number;
  answers: PublicAnswer[];
};

export type QuizListItem = QuizRow & {
  questionCount: number;
  lastScore: number | null;
  lastPassed: boolean | null;
};

export type SubmitAnswerPayload = Record<string, string>;

export type ScoredAnswer = {
  questionId: string;
  selectedLetter: string;
  selectedAnswerId: string;
  correctAnswerId: string;
  correctLetter: string;
  correct: boolean;
  points: number;
};

export type SubmitResult = {
  attemptId: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  passed: boolean;
  passingScore: number;
  status: AttemptStatus;
  durationSec: number;
  answers: ScoredAnswer[];
};

export type HistoryItem = {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  date: string;
  score: number;
  correct: number;
  wrong: number;
  passed: boolean;
  status: AttemptStatus;
};

export type DashboardStats = {
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalCorrect: number;
  totalWrong: number;
  scoreByQuiz: { quizId: string; title: string; score: number; date: string }[];
  progressScores: { date: string; score: number; quizTitle: string }[];
};
