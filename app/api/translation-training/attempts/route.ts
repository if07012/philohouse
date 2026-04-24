import { NextResponse } from "next/server";
import { listRowsBySheet } from "@/app/lib/googleSheets";
import {
  getTranslationAttemptSheetName,
  getTranslationSpreadsheetId,
} from "@/app/translation-training/lib/env";
import type { TranslationAttempt } from "@/app/translation-training/lib/types";

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseJson<T>(v: unknown, fallback: T): T {
  const raw = str(v);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const spreadsheetId = getTranslationSpreadsheetId();
    const sheetName = getTranslationAttemptSheetName();
    const rows = (await listRowsBySheet(spreadsheetId, sheetName)) as Record<
      string,
      unknown
    >[];

    const attempts: TranslationAttempt[] = rows
      .map((r) => ({
        attempt_id: str(r.attempt_id),
        item_id: str(r.item_id),
        english: str(r.english),
        student_indonesian: str(r.student_indonesian),
        score_percent: num(r.score_percent),
        overall_feedback: str(r.overall_feedback),
        issues: parseJson(r.issues_json, []),
        drill: parseJson(r.drill_json, []),
        created_at: str(r.created_at),
      }))
      .filter((a) => a.attempt_id && a.item_id && a.english)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return NextResponse.json({ ok: true, attempts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/translation-training/attempts:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

