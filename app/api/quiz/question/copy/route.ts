import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  createQuestion,
  getQuizById,
  listQuestionsForQuiz,
  listAnswersForQuestions,
  upsertAnswersForQuestion,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";

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
    const sourceQuizId = String(body?.sourceQuizId ?? "").trim();
    const targetQuizId = String(body?.targetQuizId ?? "").trim();
    const questionIds = Array.isArray(body?.questionIds) 
      ? body.questionIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    if (!sourceQuizId) {
      return NextResponse.json({ error: "sourceQuizId is required" }, { status: 400 });
    }
    if (!targetQuizId) {
      return NextResponse.json({ error: "targetQuizId is required" }, { status: 400 });
    }
    if (questionIds.length === 0) {
      return NextResponse.json({ error: "At least one question must be selected" }, { status: 400 });
    }

    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);

    // Verify both quizzes exist
    const sourceQuiz = await getQuizById(sourceQuizId, spreadsheetId);
    if (!sourceQuiz) {
      return NextResponse.json({ error: "Source quiz not found" }, { status: 404 });
    }

    const targetQuiz = await getQuizById(targetQuizId, spreadsheetId);
    if (!targetQuiz) {
      return NextResponse.json({ error: "Target quiz not found" }, { status: 404 });
    }

    // Get all questions from source quiz to filter the selected ones
    const allSourceQuestions = await listQuestionsForQuiz(sourceQuizId, spreadsheetId, 0);
    const sourceQuestions = allSourceQuestions.filter((q) => questionIds.includes(q.id));

    if (sourceQuestions.length === 0) {
      return NextResponse.json({ error: "No valid questions found" }, { status: 404 });
    }

    // Get answers for all selected questions
    const answers = await listAnswersForQuestions(
      sourceQuestions.map((q) => q.id),
      spreadsheetId,
      0
    );

    // Get current max orderIndex in target quiz
    const existingTargetQuestions = await listQuestionsForQuiz(targetQuizId, spreadsheetId, 0);
    const baseOrder = existingTargetQuestions.reduce((max, q) => Math.max(max, q.orderIndex), 0);

    // Copy questions to target quiz
    const createdIds: string[] = [];
    for (let i = 0; i < sourceQuestions.length; i++) {
      const sourceQ = sourceQuestions[i];
      const orderIndex = baseOrder + i + 1;

      const { id: newQuestionId } = await createQuestion(
        {
          quizId: targetQuizId,
          orderIndex,
          type: sourceQ.type,
          question: sourceQ.question,
          imageUrl: sourceQ.imageUrl,
          score: sourceQ.score,
        },
        spreadsheetId
      );

      // Get answers for this specific question
      const questionAnswers = answers.filter((a) => a.questionId === sourceQ.id);

      await upsertAnswersForQuestion(
        newQuestionId,
        questionAnswers.map((a) => ({
          letter: a.letter,
          type: a.type,
          text: a.text,
          imageUrl: a.imageUrl,
          isCorrect: a.isCorrect,
        })),
        spreadsheetId
      );

      createdIds.push(newQuestionId);
    }

    return NextResponse.json({
      success: true,
      copied: createdIds.length,
      questionIds: createdIds,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
