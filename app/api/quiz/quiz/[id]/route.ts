import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  listQuestionsForQuiz,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    const quiz = await getQuizById(id, spreadsheetId);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    const admin = await isAdmin();
    if (!quiz.active && !admin) {
      return NextResponse.json({ error: "Quiz not available" }, { status: 404 });
    }
    const questions = await listQuestionsForQuiz(id, spreadsheetId);
    return NextResponse.json({ quiz: { ...quiz, questionCount: questions.length } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, ctx: RouteCtx) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const body = await request.json();
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    const existing = await getQuizById(id, spreadsheetId);
    if (!existing) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.description !== undefined) patch.description = String(body.description).trim();
    if (body.duration !== undefined) patch.duration = Number(body.duration);
    if (body.passingScore !== undefined) patch.passingScore = Number(body.passingScore);
    if (body.active !== undefined) patch.active = Boolean(body.active);

    await updateQuiz(id, patch, spreadsheetId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    await deleteQuiz(id, spreadsheetId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
