import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  createQuestion,
  getQuizById,
  listQuestionsForQuiz,
  upsertAnswersForQuestion,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";
import { parseImportQuestionsPayload } from "@/app/quiz/lib/importQuestions";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const quizId = String(body?.quizId ?? "").trim();
    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const questions = parseImportQuestionsPayload(body?.questions ?? body);

    
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);

    const quiz = await getQuizById(quizId, spreadsheetId);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const existing = await listQuestionsForQuiz(quizId, spreadsheetId, 0);
    const baseOrder = existing.reduce((max, q) => Math.max(max, q.orderIndex), 0);

    const sorted = [...questions].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );

    const createdIds: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const orderIndex = baseOrder + i + 1;

      const { id: questionId } = await createQuestion(
        {
          quizId,
          orderIndex,
          type: item.type,
          question: item.question,
          imageUrl: item.imageUrl,
          score: item.score,
        },
        spreadsheetId
      );

      await upsertAnswersForQuestion(
        questionId,
        item.answers.map((a) => ({
          letter: a.letter,
          type: a.type,
          text: a.text,
          imageUrl: a.imageUrl,
          isCorrect: a.isCorrect === "true"|| a.isCorrect === true ? true : false,
        })),
        spreadsheetId
      );

      createdIds.push(questionId);
    }

    return NextResponse.json({
      success: true,
      imported: createdIds.length,
      questionIds: createdIds,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
