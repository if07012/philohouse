import crypto from "crypto";
import { getMysterySessionSecret } from "./mysteryEnv";

export const MYSTERY_SESSION_COOKIE = "mystery_session";

export type MysterySessionPayload = {
  familyId: string;
  exp: number;
};

export function signMysterySession(
  payload: MysterySessionPayload,
  secret?: string
): string {
  const s = secret ?? getMysterySessionSecret();
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", s).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMysterySession(
  token: string,
  secret?: string
): MysterySessionPayload | null {
  const s = secret ?? getMysterySessionSecret();
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
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MysterySessionPayload;
    if (typeof p.familyId !== "string" || typeof p.exp !== "number") return null;
    if (Date.now() / 1000 > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

export function createSessionToken(familyId: string, maxAgeSec = 60 * 60 * 24 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  return signMysterySession({ familyId, exp });
}
