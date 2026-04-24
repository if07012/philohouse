import { NextResponse } from "next/server";
import { segmentEnglishUnitsWithAi } from "@/app/translation-training/lib/segment";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const english = String(body?.english ?? "").trim();
    if (!english) {
      return NextResponse.json({ error: "english is required" }, { status: 400 });
    }
    const units = await segmentEnglishUnitsWithAi(english);
    return NextResponse.json({ ok: true, units });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/translation-training/segment:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

