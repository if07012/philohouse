import { cookies } from "next/headers";
import {
  MYSTERY_SESSION_COOKIE,
  verifyMysterySession,
  type MysterySessionPayload,
} from "./session";

export async function getMysterySession(): Promise<MysterySessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(MYSTERY_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifyMysterySession(raw);
}

export async function setMysterySessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(MYSTERY_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearMysterySessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(MYSTERY_SESSION_COOKIE);
}
