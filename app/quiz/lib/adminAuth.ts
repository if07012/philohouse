import crypto from "crypto";
import { getQuizSessionSecret } from "./env";

export const QUIZ_ADMIN_COOKIE = "quiz_admin_session";

export type QuizAdminSession = {
  role: "admin";
  exp: number;
};

export function signQuizAdminSession(
  payload: QuizAdminSession,
  secret?: string
): string {
  const s = secret ?? getQuizSessionSecret();
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", s).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyQuizAdminSession(
  token: string,
  secret?: string
): QuizAdminSession | null {
  const s = secret ?? getQuizSessionSecret();
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", s).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as QuizAdminSession;
    if (p.role !== "admin" || typeof p.exp !== "number") return null;
    if (Date.now() / 1000 > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

export function createAdminSessionToken(maxAgeSec = 60 * 60 * 8): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  return signQuizAdminSession({ role: "admin", exp });
}
