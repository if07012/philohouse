import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";
import { clearAllGoogleSheetsCache } from "@/app/lib/googleSheets";

async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyQuizAdminSession(token) !== null;
}

export async function POST() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = clearAllGoogleSheetsCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
