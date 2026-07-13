import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  loadQuizSession,
  getAttemptById,
  listUserAnswersForAttempt,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";

type RouteCtx = { params: Promise<{ quizId: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  try {
    const { quizId } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get("attemptId")?.trim();

    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);

    let admin = false;
    if (searchParams.get("includeAnswerKey") === "1") {
      const jar = await cookies();
      const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
      admin = token ? verifyQuizAdminSession(token) !== null : false;
    }

    const session = await loadQuizSession(quizId, admin, spreadsheetId);

    let attempt = null;
    let userAnswers: Awaited<ReturnType<typeof listUserAnswersForAttempt>> = [];
    if (attemptId) {
      attempt = await getAttemptById(attemptId, spreadsheetId);
      if (attempt) {
        userAnswers = await listUserAnswersForAttempt(attemptId, spreadsheetId);
      }
    }

    return NextResponse.json({
      quiz: session.quiz,
      questions: session.questions,
      answerKey: session.answerKey,
      attempt,
      userAnswers,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Quiz not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
