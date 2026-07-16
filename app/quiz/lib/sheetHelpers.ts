import {
  ensureSheetWithHeaders,
  listRowsBySheet,
  createRowWithId,
  updateRowById,
  deleteRowById,
  appendSheetData,
  SHEET_ROWS_SLOW_TTL_MS,
} from "@/app/lib/googleSheets";
import { getQuizSpreadsheetId } from "./env";
import type {
  AnswerRow,
  AttemptRow,
  ContentType,
  DashboardStats,
  HistoryItem,
  PublicAnswer,
  PublicQuestion,
  QuestionRow,
  QuizListItem,
  QuizRow,
  UserAnswerRow,
  UserRow,
} from "./types";
import {
  ANSWER_HEADERS,
  ATTEMPT_HEADERS,
  QUESTION_HEADERS,
  QUIZ_HEADERS,
  QUIZ_SHEETS,
  USER_ANSWER_HEADERS,
  USER_HEADERS,
} from "./types";

function parseBool(value: unknown, defaultValue = true): boolean {
  if (value === true || value === "true" || value === "TRUE" || value === "1" || value === 1) {
    return true;
  }
  if (value === false || value === "false" || value === "FALSE" || value === "0" || value === 0) {
    return false;
  }
  return defaultValue;
}

function parseNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseContentType(value: unknown): ContentType {
  const v = String(value ?? "text").toLowerCase();
  if (v === "image" || v === "mixed") return v;
  return "text";
}

function boolToSheet(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

function serializeQuizWrite(
  data: Partial<Omit<QuizRow, "id" | "createdAt">>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (data.title !== undefined) out.title = String(data.title);
  if (data.description !== undefined) out.description = String(data.description);
  if (data.duration !== undefined) out.duration = String(Number(data.duration));
  if (data.passingScore !== undefined) out.passingScore = String(Number(data.passingScore));
  if (data.active !== undefined) out.active = boolToSheet(data.active);
  return out;
}

function serializeQuestionWrite(
  data: Partial<Omit<QuestionRow, "id">>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (data.quizId !== undefined) out.quizId = String(data.quizId);
  if (data.orderIndex !== undefined) out.orderIndex = String(Number(data.orderIndex));
  if (data.score !== undefined) out.score = String(Number(data.score));
  if (data.question !== undefined) out.question = String(data.question);
  if (data.imageUrl !== undefined) out.imageUrl = String(data.imageUrl);
  if (data.type !== undefined) {
    const t = String(data.type).toLowerCase();
    out.type = t === "image" || t === "mixed" ? t : "text";
  }
  return out;
}

function serializeAnswerWrite(
  data: Partial<Omit<AnswerRow, "id">>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (data.questionId !== undefined) out.questionId = String(data.questionId);
  if (data.letter !== undefined) out.letter = String(data.letter).toUpperCase();
  if (data.text !== undefined) out.text = String(data.text);
  if (data.imageUrl !== undefined) out.imageUrl = String(data.imageUrl);
  if (data.isCorrect !== undefined) out.isCorrect = boolToSheet(Boolean(data.isCorrect));
  if (data.type !== undefined) {
    const t = String(data.type).toLowerCase();
    out.type = t === "image" || t === "mixed" ? t : "text";
  }
  return out;
}

export type AnswerInput = {
  id?: string;
  letter: string;
  type: ContentType;
  text: string;
  imageUrl: string;
  isCorrect: boolean;
};

export function parseQuizRow(row: Record<string, unknown>): QuizRow {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    duration: parseNumber(row.duration, 30),
    passingScore: parseNumber(row.passingScore, 0),
    active: parseBool(row.active, true),
    createdAt: String(row.createdAt ?? ""),
  };
}

export function parseQuestionRow(row: Record<string, unknown>): QuestionRow {
  return {
    id: String(row.id ?? ""),
    quizId: String(row.quizId ?? ""),
    orderIndex: parseNumber(row.orderIndex, 0),
    type: parseContentType(row.type),
    question: String(row.question ?? ""),
    imageUrl: String(row.imageUrl ?? ""),
    score: parseNumber(row.score, 0),
  };
}

export function parseAnswerRow(row: Record<string, unknown>): AnswerRow {
  return {
    id: String(row.id ?? ""),
    questionId: String(row.questionId ?? ""),
    letter: String(row.letter ?? "").toUpperCase(),
    type: parseContentType(row.type),
    text: String(row.text ?? ""),
    imageUrl: String(row.imageUrl ?? ""),
    isCorrect: parseBool(row.isCorrect, false),
  };
}

export function parseAttemptRow(row: Record<string, unknown>): AttemptRow {
  return {
    id: String(row.id ?? ""),
    userId: String(row.userId ?? ""),
    quizId: String(row.quizId ?? ""),
    startTime: String(row.startTime ?? ""),
    finishTime: String(row.finishTime ?? ""),
    durationSec: parseNumber(row.durationSec, 0),
    score: parseNumber(row.score, 0),
    correct: parseNumber(row.correct, 0),
    wrong: parseNumber(row.wrong, 0),
    passed: parseBool(row.passed, false),
    status: String(row.status ?? "completed") === "timeout" ? "timeout" : "completed",
  };
}

let ensurePromise: Promise<void> | null = null;

export async function ensureQuizSheets(spreadsheetId?: string): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureSheetWithHeaders(id, QUIZ_SHEETS.quiz, [...QUIZ_HEADERS]);
      await ensureSheetWithHeaders(id, QUIZ_SHEETS.questions, [...QUESTION_HEADERS]);
      await ensureSheetWithHeaders(id, QUIZ_SHEETS.answers, [...ANSWER_HEADERS]);
      await ensureSheetWithHeaders(id, QUIZ_SHEETS.users, [...USER_HEADERS]);
      await ensureSheetWithHeaders(id, QUIZ_SHEETS.attempts, [...ATTEMPT_HEADERS]);
      await ensureSheetWithHeaders(id, QUIZ_SHEETS.userAnswers, [...USER_ANSWER_HEADERS]);
    })();
  }
  await ensurePromise;
}

export async function listQuizzes(spreadsheetId?: string): Promise<QuizRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.quiz, SHEET_ROWS_SLOW_TTL_MS);
  return rows.map(parseQuizRow).filter((q) => q.id);
}

export async function getQuizById(quizId: string, spreadsheetId?: string): Promise<QuizRow | null> {
  const quizzes = await listQuizzes(spreadsheetId);
  return quizzes.find((q) => q.id === quizId) ?? null;
}

export async function listQuestionsForQuiz(
  quizId: string,
  spreadsheetId?: string,
  ttlMs = SHEET_ROWS_SLOW_TTL_MS
): Promise<QuestionRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.questions, ttlMs);
  return rows
    .map(parseQuestionRow)
    .filter((q) => q.quizId === quizId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function listAnswersForQuestions(
  questionIds: string[],
  spreadsheetId?: string,
  ttlMs = SHEET_ROWS_SLOW_TTL_MS
): Promise<AnswerRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const set = new Set(questionIds);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.answers, ttlMs);
  return rows
    .map(parseAnswerRow)
    .filter((a) => set.has(a.questionId))
    .sort((a, b) => a.letter.localeCompare(b.letter));
}

export async function listAllAnswers(spreadsheetId?: string): Promise<AnswerRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.answers, SHEET_ROWS_SLOW_TTL_MS);
  return rows.map(parseAnswerRow).filter((a) => a.id);
}

export function toPublicQuestions(
  questions: QuestionRow[],
  answers: AnswerRow[]
): PublicQuestion[] {
  const byQuestion = new Map<string, PublicAnswer[]>();
  for (const a of answers) {
    const list = byQuestion.get(a.questionId) ?? [];
    list.push({
      id: a.id,
      letter: a.letter,
      type: a.type,
      text: a.text,
      imageUrl: a.imageUrl,
    });
    byQuestion.set(a.questionId, list);
  }
  return questions.map((q) => ({
    id: q.id,
    orderIndex: q.orderIndex,
    type: q.type,
    question: q.question,
    imageUrl: q.imageUrl,
    score: q.score,
    answers: (byQuestion.get(q.id) ?? []).sort((a, b) =>
      a.letter.localeCompare(b.letter)
    ),
  }));
}

export async function listQuizItemsForUser(
  userId: string,
  spreadsheetId?: string
): Promise<QuizListItem[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  const [quizzes, questions, attempts] = await Promise.all([
    listQuizzes(id),
    listRowsBySheet(id, QUIZ_SHEETS.questions, SHEET_ROWS_SLOW_TTL_MS).then((r) =>
      r.map(parseQuestionRow)
    ),
    listAttemptsForUser(userId, id),
  ]);

  const questionCountByQuiz = new Map<string, number>();
  for (const q of questions) {
    questionCountByQuiz.set(q.quizId, (questionCountByQuiz.get(q.quizId) ?? 0) + 1);
  }

  const lastAttemptByQuiz = new Map<string, AttemptRow>();
  for (const a of attempts) {
    const prev = lastAttemptByQuiz.get(a.quizId);
    if (!prev || a.finishTime > prev.finishTime) {
      lastAttemptByQuiz.set(a.quizId, a);
    }
  }

  return quizzes
    .filter((q) => q.active)
    .map((q) => {
      const last = lastAttemptByQuiz.get(q.id);
      return {
        ...q,
        questionCount: questionCountByQuiz.get(q.id) ?? 0,
        lastScore: last ? last.score : null,
        lastPassed: last ? last.passed : null,
      };
    });
}

export async function createQuiz(
  data: Omit<QuizRow, "id" | "createdAt">,
  spreadsheetId?: string
): Promise<{ id: string }> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  return createRowWithId(id, QUIZ_SHEETS.quiz, {
    title: String(data.title),
    description: String(data.description),
    duration: String(data.duration),
    passingScore: String(data.passingScore),
    active: boolToSheet(data.active),
    createdAt: new Date().toISOString(),
  });
}

export async function updateQuiz(
  quizId: string,
  data: Partial<Omit<QuizRow, "id" | "createdAt">>,
  spreadsheetId?: string
): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  await updateRowById(id, QUIZ_SHEETS.quiz, quizId, serializeQuizWrite(data));
}

export async function deleteQuiz(quizId: string, spreadsheetId?: string): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const questions = await listQuestionsForQuiz(quizId, id);
  const questionIds = questions.map((q) => q.id);
  const answers = await listAnswersForQuestions(questionIds, id);
  for (const a of answers) {
    await deleteRowById(id, QUIZ_SHEETS.answers, a.id);
  }
  for (const q of questions) {
    await deleteRowById(id, QUIZ_SHEETS.questions, q.id);
  }
  await deleteRowById(id, QUIZ_SHEETS.quiz, quizId);
}

export async function createQuestion(
  data: Omit<QuestionRow, "id">,
  spreadsheetId?: string
): Promise<{ id: string }> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  return createRowWithId(id, QUIZ_SHEETS.questions, {
    quizId: String(data.quizId),
    orderIndex: String(data.orderIndex),
    type: data.type,
    question: String(data.question),
    imageUrl: String(data.imageUrl),
    score: String(data.score),
  });
}

export async function updateQuestion(
  questionId: string,
  data: Partial<Omit<QuestionRow, "id">>,
  spreadsheetId?: string
): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  await updateRowById(id, QUIZ_SHEETS.questions, questionId, serializeQuestionWrite(data));
}

export async function deleteQuestion(
  questionId: string,
  spreadsheetId?: string
): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const answers = await listAnswersForQuestions([questionId], id);
  for (const a of answers) {
    await deleteRowById(id, QUIZ_SHEETS.answers, a.id);
  }
  await deleteRowById(id, QUIZ_SHEETS.questions, questionId);
}

export async function createAnswer(
  data: Omit<AnswerRow, "id">,
  spreadsheetId?: string
): Promise<{ id: string }> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  return createRowWithId(id, QUIZ_SHEETS.answers, {
    questionId: String(data.questionId),
    letter: data.letter.toUpperCase(),
    type: data.type,
    text: String(data.text),
    imageUrl: String(data.imageUrl),
    isCorrect: boolToSheet(data.isCorrect),
  });
}

export async function updateAnswer(
  answerId: string,
  data: Partial<Omit<AnswerRow, "id">>,
  spreadsheetId?: string
): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  await updateRowById(id, QUIZ_SHEETS.answers, answerId, serializeAnswerWrite(data));
}

export async function upsertAnswersForQuestion(
  questionId: string,
  answers: AnswerInput[],
  spreadsheetId?: string
): Promise<AnswerRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const existing = await listAnswersForQuestions([questionId], id, 0);

  for (const a of answers) {
    const letter = String(a.letter ?? "").trim().toUpperCase();
    if (!letter) continue;

    const payload = serializeAnswerWrite({
      questionId,
      letter,
      type: a.type,
      text: String(a.text ?? ""),
      imageUrl: String(a.imageUrl ?? ""),
      isCorrect: a.isCorrect,
    });

    const answerId = String(a.id ?? "").trim();
    const match =
      (answerId ? existing.find((e) => e.id === answerId) : undefined) ??
      existing.find((e) => e.letter === letter);

    if (match) {
      await updateRowById(id, QUIZ_SHEETS.answers, match.id, payload);
    } else {
      const created = await createRowWithId(id, QUIZ_SHEETS.answers, payload);
      existing.push({
        id: created.id,
        questionId,
        letter,
        type: (payload.type as ContentType) ?? "text",
        text: String(payload.text ?? ""),
        imageUrl: String(payload.imageUrl ?? ""),
        isCorrect: Boolean(a.isCorrect),
      });
    }
  }

  return listAnswersForQuestions([questionId], id, 0);
}

export async function deleteAnswer(
  answerId: string,
  spreadsheetId?: string
): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  await deleteRowById(id, QUIZ_SHEETS.answers, answerId);
}

export async function ensureUser(
  userId: string,
  name: string,
  spreadsheetId?: string
): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.users, SHEET_ROWS_SLOW_TTL_MS);
  const existing = rows.find((r) => String(r.id) === userId);
  if (existing) {
    if (name && String(existing.name) !== name) {
      await updateRowById(id, QUIZ_SHEETS.users, userId, { name });
    }
    return;
  }
  await appendSheetData(
    id,
    [{ id: userId, name, createdAt: new Date().toISOString() }],
    QUIZ_SHEETS.users
  );
}

export async function listAttemptsForUser(
  userId: string,
  spreadsheetId?: string
): Promise<AttemptRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.attempts, SHEET_ROWS_SLOW_TTL_MS);
  return rows
    .map(parseAttemptRow)
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.finishTime.localeCompare(a.finishTime));
}

export async function listAllAttempts(spreadsheetId?: string): Promise<AttemptRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.attempts, SHEET_ROWS_SLOW_TTL_MS);
  return rows.map(parseAttemptRow).filter((a) => a.id);
}

export async function getAttemptById(
  attemptId: string,
  spreadsheetId?: string
): Promise<AttemptRow | null> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.attempts, SHEET_ROWS_SLOW_TTL_MS);
  const row = rows.find((r) => String(r.id) === attemptId);
  return row ? parseAttemptRow(row) : null;
}

export async function saveAttempt(
  attempt: AttemptRow,
  userAnswers: UserAnswerRow[],
  spreadsheetId?: string
): Promise<void> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  await appendSheetData(
    id,
    [
      {
        ...attempt,
        passed: boolToSheet(attempt.passed),
      } as unknown as Record<string, unknown>,
    ],
    QUIZ_SHEETS.attempts
  );
  if (userAnswers.length) {
    await appendSheetData(
      id,
      userAnswers.map((ua) => ({
        ...ua,
        correct: boolToSheet(ua.correct),
      })) as unknown as Record<string, unknown>[],
      QUIZ_SHEETS.userAnswers
    );
  }
}

export async function listUserAnswersForAttempt(
  attemptId: string,
  spreadsheetId?: string
): Promise<UserAnswerRow[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  await ensureQuizSheets(id);
  const rows = await listRowsBySheet(id, QUIZ_SHEETS.userAnswers, SHEET_ROWS_SLOW_TTL_MS);
  return rows
    .filter((r) => String(r.attemptId) === attemptId)
    .map((r) => ({
      id: String(r.id ?? ""),
      attemptId: String(r.attemptId ?? ""),
      questionId: String(r.questionId ?? ""),
      selectedAnswerId: String(r.selectedAnswerId ?? ""),
      selectedLetter: String(r.selectedLetter ?? ""),
      correct: parseBool(r.correct, false),
    }));
}

export async function getHistoryForUser(
  userId: string,
  filters?: { quizTitle?: string; dateFrom?: string; dateTo?: string; minScore?: number },
  spreadsheetId?: string
): Promise<HistoryItem[]> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  const [attempts, quizzes] = await Promise.all([
    listAttemptsForUser(userId, id),
    listQuizzes(id),
  ]);
  const titleById = new Map(quizzes.map((q) => [q.id, q.title]));

  let items: HistoryItem[] = attempts.map((a) => ({
    attemptId: a.id,
    quizId: a.quizId,
    quizTitle: titleById.get(a.quizId) ?? "Quiz",
    date: a.finishTime,
    score: a.score,
    correct: a.correct,
    wrong: a.wrong,
    passed: a.passed,
    status: a.status,
  }));

  if (filters?.quizTitle?.trim()) {
    const term = filters.quizTitle.trim().toLowerCase();
    items = items.filter((i) => i.quizTitle.toLowerCase().includes(term));
  }
  if (filters?.dateFrom) {
    items = items.filter((i) => i.date >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    items = items.filter((i) => i.date <= filters.dateTo!);
  }
  if (filters?.minScore != null && Number.isFinite(filters.minScore)) {
    items = items.filter((i) => i.score >= filters.minScore!);
  }

  return items;
}

export async function getDashboardForUser(
  userId: string,
  spreadsheetId?: string
): Promise<DashboardStats> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  const history = await getHistoryForUser(userId, undefined, id);

  if (!history.length) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      scoreByQuiz: [],
      progressScores: [],
    };
  }

  const scores = history.map((h) => h.score);
  const totalCorrect = history.reduce((s, h) => s + h.correct, 0);
  const totalWrong = history.reduce((s, h) => s + h.wrong, 0);

  return {
    totalAttempts: history.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    totalCorrect,
    totalWrong,
    scoreByQuiz: history.map((h) => ({
      quizId: h.quizId,
      title: h.quizTitle,
      score: h.score,
      date: h.date,
    })),
    progressScores: [...history]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => ({
        date: h.date,
        score: h.score,
        quizTitle: h.quizTitle,
      })),
  };
}

export async function getAdminReport(spreadsheetId?: string): Promise<DashboardStats> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  const [attempts, quizzes] = await Promise.all([listAllAttempts(id), listQuizzes(id)]);
  const titleById = new Map(quizzes.map((q) => [q.id, q.title]));

  if (!attempts.length) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      scoreByQuiz: [],
      progressScores: [],
    };
  }

  const scores = attempts.map((a) => a.score);
  const history = attempts
    .sort((a, b) => b.finishTime.localeCompare(a.finishTime))
    .map((a) => ({
      quizId: a.quizId,
      title: titleById.get(a.quizId) ?? "Quiz",
      score: a.score,
      date: a.finishTime,
    }));

  return {
    totalAttempts: attempts.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    totalCorrect: attempts.reduce((s, a) => s + a.correct, 0),
    totalWrong: attempts.reduce((s, a) => s + a.wrong, 0),
    scoreByQuiz: history,
    progressScores: [...attempts]
      .sort((a, b) => a.finishTime.localeCompare(b.finishTime))
      .map((a) => ({
        date: a.finishTime,
        score: a.score,
        quizTitle: titleById.get(a.quizId) ?? "Quiz",
      })),
  };
}

export async function loadQuizSession(
  quizId: string,
  includeAnswerKey = false,
  spreadsheetId?: string
): Promise<{
  quiz: QuizRow;
  questions: PublicQuestion[];
  answerKey?: Record<string, string>;
}> {
  const id = spreadsheetId ?? getQuizSpreadsheetId();
  const quiz = await getQuizById(quizId, id);
  if (!quiz) throw new Error("Quiz not found");

  const questions = await listQuestionsForQuiz(quizId, id);
  const answers = await listAnswersForQuestions(
    questions.map((q) => q.id),
    id
  );
  const publicQuestions = toPublicQuestions(questions, answers);

  const result: {
    quiz: QuizRow;
    questions: PublicQuestion[];
    answerKey?: Record<string, string>;
  } = { quiz, questions: publicQuestions };

  if (includeAnswerKey) {
    const key: Record<string, string> = {};
    for (const q of questions) {
      const correct = answers.find((a) => a.questionId === q.id && a.isCorrect);
      if (correct) key[q.id] = correct.letter;
    }
    result.answerKey = key;
  }

  return result;
}
