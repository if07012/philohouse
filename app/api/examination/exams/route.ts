import { NextResponse } from "next/server";
import { getGrade4ExamSpreadsheetId } from "@/app/examination/lib/env";
import {
  ensureExamSheets,
  listExams,
} from "@/app/examination/lib/sheetHelpers";

export async function GET() {
  try {
    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);
    const exams = await listExams(spreadsheetId);
    return NextResponse.json({ exams });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/examination/exams:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
