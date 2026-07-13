import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyQuizAdminSession, QUIZ_ADMIN_COOKIE } from "@/app/quiz/lib/adminAuth";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(QUIZ_ADMIN_COOKIE)?.value;
  const session = token ? verifyQuizAdminSession(token) : null;
  return NextResponse.json({ authenticated: session !== null });
}
