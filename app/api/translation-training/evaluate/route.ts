import { NextResponse } from "next/server";
import { evaluateTranslation } from "@/app/translation-training/lib/evaluate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const english = String(body?.english ?? "").trim();
    const referenceIndonesian = String(body?.referenceIndonesian ?? "").trim();
    const studentIndonesian = String(body?.studentIndonesian ?? "").trim();

    if (!english) {
      return NextResponse.json({ error: "english is required" }, { status: 400 });
    }
    if (!studentIndonesian) {
      return NextResponse.json(
        { error: "studentIndonesian is required" },
        { status: 400 }
      );
    }

    const evaluation = await evaluateTranslation({
      english,
      referenceIndonesian,
      studentIndonesian,
    });

    return NextResponse.json({ ok: true, evaluation });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/translation-training/evaluate:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

