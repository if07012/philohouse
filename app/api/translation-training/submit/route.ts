import crypto from "crypto";
import { NextResponse } from "next/server";
import { appendSheetData, ensureSheetWithHeaders } from "@/app/lib/googleSheets";
import { evaluateTranslation } from "@/app/translation-training/lib/evaluate";
import {
  getTranslationAttemptSheetName,
  getTranslationSpreadsheetId,
} from "@/app/translation-training/lib/env";

const ATTEMPT_HEADERS = [
  "attempt_id",
  "item_id",
  "english",
  "student_indonesian",
  "score_percent",
  "overall_feedback",
  "issues_json",
  "drill_json",
  "created_at",
];

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const itemId = String(body?.itemId ?? "").trim();
    const english = String(body?.english ?? "").trim();
    const referenceIndonesian = String(body?.referenceIndonesian ?? "").trim();
    const studentIndonesian = String(body?.studentIndonesian ?? "").trim();

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }
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

    const spreadsheetId = getTranslationSpreadsheetId();
    const sheetName = getTranslationAttemptSheetName();
    await ensureSheetWithHeaders(spreadsheetId, sheetName, ATTEMPT_HEADERS);

    const attemptId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await appendSheetData(
      spreadsheetId,
      [
        {
          attempt_id: attemptId,
          item_id: itemId,
          english,
          student_indonesian: studentIndonesian,
          score_percent: String(evaluation.score_percent),
          overall_feedback: evaluation.overall_feedback,
          issues_json: JSON.stringify(evaluation.issues || []),
          drill_json: JSON.stringify(evaluation.drill || []),
          created_at: createdAt,
        },
      ],
      sheetName
    );

    return NextResponse.json({
      ok: true,
      attempt: {
        attempt_id: attemptId,
        item_id: itemId,
        english,
        student_indonesian: studentIndonesian,
        score_percent: evaluation.score_percent,
        overall_feedback: evaluation.overall_feedback,
        issues: evaluation.issues || [],
        drill: evaluation.drill || [],
        created_at: createdAt,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/translation-training/submit:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

