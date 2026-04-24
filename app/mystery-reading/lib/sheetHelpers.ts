import {
  appendSheetData,
  ensureSheetWithHeaders,
  getGoogleSheet,
  listRowsBySheet,
  updateSheetData,
} from "@/app/lib/googleSheets";
import {
  ATTEMPT_HEADERS,
  CHILD_HEADERS,
  DAILY_HEADERS,
  FAMILY_HEADERS,
  MYSTERY_SHEETS,
  QUIZ_HEADERS,
} from "./types";

export async function ensureMysterySheets(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(
    spreadsheetId,
    MYSTERY_SHEETS.daily,
    [...DAILY_HEADERS]
  );
  await ensureSheetWithHeaders(
    spreadsheetId,
    MYSTERY_SHEETS.quiz,
    [...QUIZ_HEADERS]
  );
  await ensureSheetWithHeaders(
    spreadsheetId,
    MYSTERY_SHEETS.families,
    [...FAMILY_HEADERS]
  );
  await ensureSheetWithHeaders(
    spreadsheetId,
    MYSTERY_SHEETS.children,
    [...CHILD_HEADERS]
  );
  await ensureSheetWithHeaders(
    spreadsheetId,
    MYSTERY_SHEETS.attempts,
    [...ATTEMPT_HEADERS]
  );
}

export async function listDailyRows(
  spreadsheetId: string
): Promise<Record<string, string>[]> {
  return listRowsBySheet(spreadsheetId, MYSTERY_SHEETS.daily) as Promise<
    Record<string, string>[]
  >;
}

export type MysteryDailySummary = {
  story_date: string;
  title: string;
  summary: string;
  image_url: string;
};

/** All rows in MysteryDaily with a title, newest `story_date` first. */
export async function listDailySummaries(
  spreadsheetId: string
): Promise<MysteryDailySummary[]> {
  const rows = await listDailyRows(spreadsheetId);
  const out: MysteryDailySummary[] = [];
  for (const r of rows) {
    const story_date = String(r.story_date || "").trim();
    const title = String(r.title || "").trim();
    if (!story_date || !title) continue;
    out.push({
      story_date,
      title,
      summary: String(r.summary || "").trim(),
      image_url: String(r.image_url || "").trim(),
    });
  }
  out.sort((a, b) => b.story_date.localeCompare(a.story_date));
  return out;
}

export async function getDailyByDate(
  spreadsheetId: string,
  storyDate: string
): Promise<Record<string, string> | null> {
  const rows = await listDailyRows(spreadsheetId);
  const d = storyDate.trim();
  return rows.find((r) => String(r.story_date || "").trim() === d) ?? null;
}

export async function upsertDailyRow(
  spreadsheetId: string,
  row: Record<string, string>
): Promise<void> {
  await ensureMysterySheets(spreadsheetId);
  const doc = await getGoogleSheet(spreadsheetId);
  const sheet = doc.sheetsByTitle[MYSTERY_SHEETS.daily];
  if (!sheet) throw new Error("MysteryDaily sheet missing");
  const rows = await sheet.getRows();
  const date = String(row.story_date || "").trim();
  const existing = rows.find((r) => {
    const o = r.toObject() as Record<string, string>;
    return String(o.story_date || "").trim() === date;
  });
  if (existing) {
    for (const h of DAILY_HEADERS) {
      const v = row[h];
      if (v !== undefined) (existing as unknown as Record<string, string>)[h] = v;
    }
    await existing.save();
  } else {
    await appendSheetData(spreadsheetId, [row], MYSTERY_SHEETS.daily);
  }
}

export async function getQuizByDate(
  spreadsheetId: string,
  storyDate: string
): Promise<Record<string, string> | null> {
  const rows = (await listRowsBySheet(
    spreadsheetId,
    MYSTERY_SHEETS.quiz
  )) as Record<string, string>[];
  const d = storyDate.trim();
  return rows.find((r) => String(r.story_date || "").trim() === d) ?? null;
}

export async function upsertQuizRow(
  spreadsheetId: string,
  row: Record<string, string>
): Promise<void> {
  await ensureMysterySheets(spreadsheetId);
  const doc = await getGoogleSheet(spreadsheetId);
  const sheet = doc.sheetsByTitle[MYSTERY_SHEETS.quiz];
  if (!sheet) throw new Error("MysteryQuiz sheet missing");
  const rows = await sheet.getRows();
  const date = String(row.story_date || "").trim();
  const existing = rows.find((r) => {
    const o = r.toObject() as Record<string, string>;
    return String(o.story_date || "").trim() === date;
  });
  if (existing) {
    for (const h of QUIZ_HEADERS) {
      const v = row[h];
      if (v !== undefined) (existing as unknown as Record<string, string>)[h] = v;
    }
    await existing.save();
  } else {
    await appendSheetData(spreadsheetId, [row], MYSTERY_SHEETS.quiz);
  }
}

export async function findFamilyById(
  spreadsheetId: string,
  familyId: string
): Promise<Record<string, string> | null> {
  const rows = (await listRowsBySheet(
    spreadsheetId,
    MYSTERY_SHEETS.families
  )) as Record<string, string>[];
  return (
    rows.find((r) => String(r.family_id || "").trim() === familyId.trim()) ?? null
  );
}

export async function appendFamilyRow(
  spreadsheetId: string,
  row: Record<string, string>
): Promise<void> {
  await appendSheetData(spreadsheetId, [row], MYSTERY_SHEETS.families);
}

export async function listChildrenByFamily(
  spreadsheetId: string,
  familyId: string
): Promise<Record<string, string>[]> {
  const rows = (await listRowsBySheet(
    spreadsheetId,
    MYSTERY_SHEETS.children
  )) as Record<string, string>[];
  const fid = familyId.trim();
  return rows.filter((r) => String(r.family_id || "").trim() === fid);
}

export async function findChildById(
  spreadsheetId: string,
  childId: string
): Promise<Record<string, string> | null> {
  const rows = (await listRowsBySheet(
    spreadsheetId,
    MYSTERY_SHEETS.children
  )) as Record<string, string>[];
  return (
    rows.find((r) => String(r.child_id || "").trim() === childId.trim()) ?? null
  );
}

export async function appendChildRow(
  spreadsheetId: string,
  row: Record<string, string>
): Promise<void> {
  await appendSheetData(spreadsheetId, [row], MYSTERY_SHEETS.children);
}

export async function updateChildByChildId(
  spreadsheetId: string,
  childId: string,
  patch: Record<string, string>
): Promise<Record<string, string>> {
  // Ensure schema is present so node-google-spreadsheet will actually write values.
  // If the sheet exists but is missing some headers, writes to those fields are ignored.
  const sheet = await ensureSheetWithHeaders(
    spreadsheetId,
    MYSTERY_SHEETS.children,
    [...CHILD_HEADERS]
  );
  const rows = await sheet.getRows();
  const row = rows.find((r) => {
    const o = r.toObject() as Record<string, string>;
    return String(o.child_id || "").trim() === childId.trim();
  });
  if (!row) throw new Error("Child not found");
  const rowIndex = rows.indexOf(row);
  if (rowIndex < 0) throw new Error("Child row index not found");

  // Use shared Google Sheets helper for writes + cache invalidation.
  // Note: updateSheetData uses sheet index (not sheet id).
  const existingUnknown = row.toObject() as Record<string, unknown>;
  const existing = Object.fromEntries(
    Object.entries(existingUnknown).map(([k, v]) => [
      k,
      typeof v === "string" ? v : v == null ? "" : String(v),
    ])
  ) as Record<string, string>;
  const merged: Record<string, string> = { ...existing, ...patch };
  await row.delete();
  await appendSheetData(spreadsheetId, [merged], MYSTERY_SHEETS.children);
  return merged;
}

export async function appendAttemptRow(
  spreadsheetId: string,
  row: Record<string, string>
): Promise<void> {
  await appendSheetData(spreadsheetId, [row], MYSTERY_SHEETS.attempts);
}

export async function findAttemptByChildAndDate(
  spreadsheetId: string,
  childId: string,
  storyDate: string
): Promise<Record<string, string> | null> {
  const rows = (await listRowsBySheet(
    spreadsheetId,
    MYSTERY_SHEETS.attempts
  )) as Record<string, string>[];
  const cid = childId.trim();
  const d = storyDate.trim();
  return (
    rows.find(
      (r) =>
        String(r.child_id || "").trim() === cid &&
        String(r.story_date || "").trim() === d
    ) ?? null
  );
}

export async function listAttemptsByChild(
  spreadsheetId: string,
  childId: string
): Promise<Record<string, string>[]> {
  const rows = (await listRowsBySheet(
    spreadsheetId,
    MYSTERY_SHEETS.attempts
  )) as Record<string, string>[];
  const cid = childId.trim();
  return rows.filter((r) => String(r.child_id || "").trim() === cid);
}
