import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  updateQuestion,
  deleteQuestion,
  upsertAnswersForQuestion,
  listAnswersForQuestions,
  type AnswerInput,
} from "@/app/quiz/lib/sheetHelpers";
import type { QuestionRow } from "@/app/quiz/lib/types";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

type RouteCtx = { params: Promise<{ questionId: string }> };

function parseAnswerInput(raw: unknown): AnswerInput | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const letter = String(a.letter ?? "").trim().toUpperCase();
  if (!letter) return null;
  const type = String(a.type ?? "text").toLowerCase();
  return {
    id: String(a.id ?? "").trim() || undefined,
    letter,
    type: type === "image" || type === "mixed" ? type : "text",
    text: String(a.text ?? ""),
    imageUrl: String(a.imageUrl ?? ""),
    isCorrect: Boolean(a.isCorrect),
  };
}

export async function PUT(request: Request, ctx: RouteCtx) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { questionId } = await ctx.params;
    const body = await request.json();
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);

    const patch: Record<string, unknown> = {};
    if (body.quizId !== undefined) patch.quizId = String(body.quizId);
    if (body.orderIndex !== undefined) patch.orderIndex = Number(body.orderIndex);
    if (body.type !== undefined) {
      const t = String(body.type).toLowerCase();
      patch.type = t === "image" || t === "mixed" ? t : "text";
    }
    if (body.question !== undefined) patch.question = String(body.question);
    if (body.imageUrl !== undefined) patch.imageUrl = String(body.imageUrl);
    if (body.score !== undefined) patch.score = Number(body.score);

    if (Object.keys(patch).length > 0) {
      await updateQuestion(questionId, patch as Partial<Omit<QuestionRow, "id">>, spreadsheetId);
    }

    let answers = await listAnswersForQuestions([questionId], spreadsheetId, 0);
    if (Array.isArray(body.answers)) {
      const parsed = body.answers
        .map(parseAnswerInput)
        .filter((a: AnswerInput | null): a is AnswerInput => a !== null);
      if (parsed.length > 0) {
        answers = await upsertAnswersForQuestion(questionId, parsed, spreadsheetId);
      }
    }

    return NextResponse.json({ success: true, answers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("PUT /api/quiz/question/[questionId]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { questionId } = await ctx.params;
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    await deleteQuestion(questionId, spreadsheetId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
