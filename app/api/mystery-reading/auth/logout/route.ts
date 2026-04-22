import { NextResponse } from "next/server";
import { clearMysterySessionCookie } from "@/app/mystery-reading/lib/apiAuth";

export async function POST() {
  await clearMysterySessionCookie();
  return NextResponse.json({ ok: true });
}
