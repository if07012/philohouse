import { NextResponse } from "next/server";
import { getGrade4ExamSpreadsheetId } from "@/app/examination/lib/env";
import {
  ensureExamSheets,
  findMaterial,
  loadQuestionsForExam,
  toPublicQuestions,
} from "@/app/examination/lib/sheetHelpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    if (!examId?.trim()) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    const url = new URL(request.url);
    const includeMaterial =
      url.searchParams.get("includeMaterial") === "1" ||
      url.searchParams.get("includeMaterial") === "true";

    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);
    const rows = await loadQuestionsForExam(spreadsheetId, examId.trim());
    if (rows.length === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const materialId = rows[0].material_id;
    const material = await findMaterial(spreadsheetId, materialId);
    const questions = toPublicQuestions(rows);

    return NextResponse.json({
      examId: examId.trim(),
      materialId,
      materialTitle: material?.title ?? "",
      ...(includeMaterial
        ? { materialContent: material?.content ?? "" }
        : {}),
      questions,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/examination/session/[examId]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
