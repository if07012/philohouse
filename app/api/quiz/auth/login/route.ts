import { NextResponse } from "next/server";
import {
  getQuizAdminUsername,
  getQuizAdminPassword,
} from "@/app/quiz/lib/env";
import {
  createAdminSessionToken,
  QUIZ_ADMIN_COOKIE,
} from "@/app/quiz/lib/adminAuth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (
      username !== getQuizAdminUsername() ||
      password !== getQuizAdminPassword()
    ) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createAdminSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(QUIZ_ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(QUIZ_ADMIN_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
