import { NextResponse } from "next/server";
import { getGrade4ExamSpreadsheetId } from "@/app/examination/lib/env";
import {
  ensureExamSheets,
  listMaterials,
} from "@/app/examination/lib/sheetHelpers";

export async function GET() {
  try {
    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);
    const materials = await listMaterials(spreadsheetId);
    return NextResponse.json({ materials });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/examination/materials:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
