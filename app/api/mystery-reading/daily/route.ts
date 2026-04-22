import { NextResponse } from "next/server";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  ensureMysterySheets,
  listDailySummaries,
} from "@/app/mystery-reading/lib/sheetHelpers";

/** Daftar cerita yang ada di lembar MysteryDaily (ringkas, untuk beranda). */
export async function GET() {
  try {
    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);
    const stories = await listDailySummaries(spreadsheetId);
    return NextResponse.json({ stories });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message, stories: [] }, { status: 500 });
  }
}
