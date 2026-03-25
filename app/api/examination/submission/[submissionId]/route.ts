import { NextResponse } from "next/server";
import { getGrade4ExamSpreadsheetId } from "@/app/examination/lib/env";
import type { EvaluationItem } from "@/app/examination/lib/types";
import {
  ensureExamSheets,
  findMaterial,
  findSubmissionById,
} from "@/app/examination/lib/sheetHelpers";

/**
 * Load a saved exam submission from ExamSubmissions (Google Sheet).
 * Query `examId` must match the row (prevents using a submission UUID from another exam in the URL).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const examId = new URL(request.url).searchParams.get("examId");

    if (!submissionId?.trim()) {
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }
    if (!examId?.trim()) {
      return NextResponse.json(
        { error: "examId query parameter is required" },
        { status: 400 }
      );
    }

    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);

    const row = await findSubmissionById(spreadsheetId, submissionId.trim());
    if (!row) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (row.exam_id !== examId.trim()) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    let evaluationPayload: {
      evaluation?: EvaluationItem[];
      explanations?: Record<string, string>;
    };
    try {
      evaluationPayload = JSON.parse(row.evaluation_json || "{}");
    } catch {
      return NextResponse.json(
        { error: "Invalid stored evaluation data" },
        { status: 500 }
      );
    }

    const evaluation = Array.isArray(evaluationPayload.evaluation)
      ? evaluationPayload.evaluation
      : [];
    const explanations =
      evaluationPayload.explanations &&
      typeof evaluationPayload.explanations === "object"
        ? evaluationPayload.explanations
        : {};
    let answers: Record<string, string> = {};
    try {
      const parsed = JSON.parse(row.answers_json || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        answers = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, String(v ?? "")])
        );
      }
    } catch {
      answers = {};
    }
    let hintQuestionIds: string[] = [];
    try {
      const parsed = JSON.parse(row.hint_question_ids || "[]");
      if (Array.isArray(parsed)) {
        hintQuestionIds = parsed.map((v) => String(v)).filter(Boolean);
      }
    } catch {
      hintQuestionIds = [];
    }

    const material = await findMaterial(spreadsheetId, row.material_id);

    return NextResponse.json({
      submission_id: row.submission_id,
      exam_id: row.exam_id,
      material_id: row.material_id,
      submitted_at: row.submitted_at,
      materialTitle: material?.title ?? "",
      answers,
      hintQuestionIds,
      evaluation,
      explanations,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/examination/submission/[submissionId]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
