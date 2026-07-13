import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  listQuizzes,
  createQuiz,
  listQuestionsForQuiz,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

export async function GET() {
  try {
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    const admin = await isAdmin();
    const quizzes = await listQuizzes(spreadsheetId);
    const withCounts = await Promise.all(
      quizzes.map(async (q) => {
        const questions = await listQuestionsForQuiz(q.id, spreadsheetId);
        return {
          ...q,
          questionCount: questions.length,
        };
      })
    );
    const items = admin ? withCounts : withCounts.filter((q) => q.active);
    return NextResponse.json({ quizzes: items });
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
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const duration = Number(body?.duration ?? 30);
    const passingScore = Number(body?.passingScore ?? 0);
    const active = body?.active !== false;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json({ error: "duration must be positive" }, { status: 400 });
    }

    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);
    const { id } = await createQuiz(
      { title, description, duration, passingScore, active },
      spreadsheetId
    );
    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
