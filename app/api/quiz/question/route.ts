import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  listQuestionsForQuiz,
  listAnswersForQuestions,
  createQuestion,
  getQuizById,
  upsertAnswersForQuestion,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";
import type { ContentType } from "@/app/quiz/lib/types";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId")?.trim();
    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    const admin = await isAdmin();
    const quiz = await getQuizById(quizId, spreadsheetId);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    if (!quiz.active && !admin) {
      return NextResponse.json({ error: "Quiz not available" }, { status: 404 });
    }

    const questions = await listQuestionsForQuiz(quizId, spreadsheetId);
    const answers = await listAnswersForQuestions(
      questions.map((q) => q.id),
      spreadsheetId
    );

    const includeKey = searchParams.get("includeAnswerKey") === "1" && admin;
    const questionsWithAnswers = questions.map((q) => ({
      ...q,
      answers: answers
        .filter((a) => a.questionId === q.id)
        .sort((a, b) => a.letter.localeCompare(b.letter))
        .map((a) =>
          includeKey
            ? a
            : {
                id: a.id,
                questionId: a.questionId,
                letter: a.letter,
                type: a.type,
                text: a.text,
                imageUrl: a.imageUrl,
              }
        ),
    }));

    return NextResponse.json({ questions: questionsWithAnswers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const quizId = String(body?.quizId ?? "").trim();
    const type = String(body?.type ?? "text").toLowerCase() as ContentType;
    const question = String(body?.question ?? "").trim();
    const imageUrl = String(body?.imageUrl ?? "").trim();
    const score = Number(body?.score ?? 0);
    const orderIndex = Number(body?.orderIndex ?? 0);

    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    const quiz = await getQuizById(quizId, spreadsheetId);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let resolvedOrder = orderIndex;
    if (!resolvedOrder) {
      const existing = await listQuestionsForQuiz(quizId, spreadsheetId);
      resolvedOrder = existing.length + 1;
    }

    const { id } = await createQuestion(
      {
        quizId,
        orderIndex: resolvedOrder,
        type: type === "image" || type === "mixed" ? type : "text",
        question,
        imageUrl,
        score,
      },
      spreadsheetId
    );

    await upsertAnswersForQuestion(
      id,
      [
        { letter: "A", type: "text", text: "", imageUrl: "", isCorrect: true },
        { letter: "B", type: "text", text: "", imageUrl: "", isCorrect: false },
      ],
      spreadsheetId
    );

    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
