import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import {
  ensureQuizSheets,
  getDashboardForUser,
  getAdminReport,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);

    const adminReport = searchParams.get("admin") === "1";
    if (adminReport) {
      if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const stats = await getAdminReport(spreadsheetId);
      return NextResponse.json({ stats });
    }

    const userId = searchParams.get("userId")?.trim();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const stats = await getDashboardForUser(userId, spreadsheetId);
    return NextResponse.json({ stats });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
