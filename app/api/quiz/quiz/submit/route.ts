import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  getQuizById,
  listQuestionsForQuiz,
  listAnswersForQuestions,
  ensureUser,
  saveAttempt,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";
import { scoreQuizAttempt } from "@/app/quiz/lib/scoring";
import type { AttemptStatus } from "@/app/quiz/lib/types";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const quizId = String(body?.quizId ?? "").trim();
    const attemptId = String(body?.attemptId ?? "").trim() || crypto.randomUUID();
    const userId = String(body?.userId ?? "").trim();
    const userName = String(body?.userName ?? "").trim();
    const answers = body?.answers as Record<string, string> | undefined;
    const startTime = String(body?.startTime ?? new Date().toISOString());
    const finishTime = String(body?.finishTime ?? new Date().toISOString());
    const status = (String(body?.status ?? "completed") === "timeout"
      ? "timeout"
      : "completed") as AttemptStatus;

    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers object is required" }, { status: 400 });
    }

    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    const quiz = await getQuizById(quizId, spreadsheetId);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    if (!quiz.active && !(await isAdmin())) {
      return NextResponse.json({ error: "Quiz not available" }, { status: 403 });
    }

    const questions = await listQuestionsForQuiz(quizId, spreadsheetId);
    if (!questions.length) {
      return NextResponse.json({ error: "Quiz has no questions" }, { status: 400 });
    }

    const answerRows = await listAnswersForQuestions(
      questions.map((q) => q.id),
      spreadsheetId
    );

    const startMs = new Date(startTime).getTime();
    const finishMs = new Date(finishTime).getTime();
    const durationSec = Math.max(0, Math.round((finishMs - startMs) / 1000));

    const result = scoreQuizAttempt({
      questions,
      answers: answerRows,
      userAnswers: answers,
      passingScore: quiz.passingScore,
      status,
      attemptId,
      durationSec,
    });

    await ensureUser(userId, userName || "Peserta", spreadsheetId);

    const userAnswerRows = result.answers.map((a) => ({
      id: crypto.randomUUID(),
      attemptId,
      questionId: a.questionId,
      selectedAnswerId: a.selectedAnswerId,
      selectedLetter: a.selectedLetter,
      correct: a.correct,
    }));

    await saveAttempt(
      {
        id: attemptId,
        userId,
        quizId,
        startTime,
        finishTime,
        durationSec,
        score: result.score,
        correct: result.correct,
        wrong: result.wrong,
        passed: result.passed,
        status,
      },
      userAnswerRows,
      spreadsheetId
    );

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/quiz/quiz/submit:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
