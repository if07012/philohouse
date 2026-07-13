import type { SubmitResult } from "./types";

const STORAGE_VERSION = 1 as const;
const USER_ID_KEY = "quiz-management-user-id";
const USER_NAME_KEY = "quiz-management-user-name";

export type QuizPersistedState = {
  version: typeof STORAGE_VERSION;
  attemptId: string;
  quizId: string;
  userId: string;
  answers: Record<string, string>;
  currentIndex: number;
  startTime: string;
  expiresAt: number;
  submitted: boolean;
  questionOrder?: string[];
  status?: "completed" | "timeout";
  results?: SubmitResult;
};

export function storageKeyForQuiz(quizId: string): string {
  return `quiz-mgmt-v${STORAGE_VERSION}-${quizId}`;
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function getUserName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USER_NAME_KEY) ?? "";
}

export function setUserName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_NAME_KEY, name.trim());
}

export function loadQuizState(quizId: string): QuizPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKeyForQuiz(quizId));
    if (!raw) return null;
    const p = JSON.parse(raw) as QuizPersistedState;
    if (p?.version !== STORAGE_VERSION || p.quizId !== quizId) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveQuizState(state: QuizPersistedState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKeyForQuiz(state.quizId), JSON.stringify(state));
}

export function clearQuizState(quizId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKeyForQuiz(quizId));
}

export function createFreshQuizState(params: {
  quizId: string;
  userId: string;
  durationMinutes: number;
}): QuizPersistedState {
  const now = Date.now();
  return {
    version: STORAGE_VERSION,
    attemptId: crypto.randomUUID(),
    quizId: params.quizId,
    userId: params.userId,
    answers: {},
    currentIndex: 0,
    startTime: new Date(now).toISOString(),
    expiresAt: now + params.durationMinutes * 60 * 1000,
    submitted: false,
  };
}

/** Start a new attempt (clears previous submitted/in-progress state). */
export function beginQuizAttempt(quizId: string, durationMinutes: number): QuizPersistedState {
  const fresh = createFreshQuizState({
    quizId,
    userId: getOrCreateUserId(),
    durationMinutes,
  });
  saveQuizState(fresh);
  return fresh;
}

export function reorderQuestions<T extends { id: string }>(questions: T[], order?: string[]): T[] {
  if (!order || order.length !== questions.length) return questions;
  const questionById = new Map(questions.map((q) => [q.id, q]));
  return order.map((id) => questionById.get(id)).filter((q): q is T => Boolean(q));
}

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function isQuizInProgress(state: QuizPersistedState | null): boolean {
  return Boolean(state && !state.submitted && state.expiresAt > Date.now());
}

export function formatTimeRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
