import { NextResponse } from "next/server";
import { getGrade4ExamSpreadsheetId } from "@/app/examination/lib/env";
import {
  countSubmissionsPerExam,
  ensureExamSheets,
  listExams,
} from "@/app/examination/lib/sheetHelpers";

export async function GET() {
  try {
    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);
    const [exams, submissionCounts] = await Promise.all([
      listExams(spreadsheetId),
      countSubmissionsPerExam(spreadsheetId),
    ]);
    const examsWithSubmissions = exams.map((e) => ({
      ...e,
      submission_count: submissionCounts.get(e.exam_id) ?? 0,
    }));
    return NextResponse.json({ exams: examsWithSubmissions });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/examination/exams:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
