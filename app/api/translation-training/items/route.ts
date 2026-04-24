import { NextResponse } from "next/server";
import { listRowsBySheet } from "@/app/lib/googleSheets";
import {
  getTranslationSheetName,
  getTranslationSpreadsheetId,
} from "@/app/translation-training/lib/env";
import type { TranslationTrainingItem } from "@/app/translation-training/lib/types";

function normCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function pickId(row: Record<string, unknown>, fallback: string): string {
  const fromId = normCell(row.id);
  if (fromId) return fromId;
  const fromKey = normCell(row.key);
  if (fromKey) return fromKey;
  return fallback;
}

function parseTags(v: unknown): string[] {
  const raw = normCell(v);
  if (!raw) return [];
  return raw
    .split(/[,;|]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function GET() {
  try {
    const spreadsheetId = getTranslationSpreadsheetId();
    const sheetName = getTranslationSheetName();
    const rows = (await listRowsBySheet(spreadsheetId, sheetName)) as Record<
      string,
      unknown
    >[];

    const items: TranslationTrainingItem[] = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx] || {};
      const english =
        normCell(r.english) || normCell(r.en) || normCell(r.source) || "";
      const indonesian_reference =
        normCell(r.indonesian) ||
        normCell(r.idn) ||
        normCell(r.ind) ||
        normCell(r.reference) ||
        normCell(r.target) ||
        "";

      // Skip empty rows
      if (!english) continue;

      items.push({
        id: pickId(r, `row_${idx + 1}`),
        english,
        indonesian_reference,
        tags: parseTags(r.tags),
      });
    }

    return NextResponse.json({ ok: true, sheetName, count: items.length, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/translation-training/items:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

