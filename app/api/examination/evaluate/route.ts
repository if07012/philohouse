import { NextResponse } from "next/server";
import crypto from "crypto";
import { evaluateAnswers } from "@/app/examination/lib/examEvaluation";
import { getGrade4ExamSpreadsheetId } from "@/app/examination/lib/env";
import { notifyExamSubmissionTelegram } from "@/app/examination/lib/examTelegramNotify";
import {
  appendExamSubmission,
  ensureExamSheets,
  findMaterial,
  loadQuestionsForExam,
} from "@/app/examination/lib/sheetHelpers";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const examId = body?.examId as string | undefined;
    const answers = body?.answers as Record<string, string> | undefined;
    const persist = body?.persist !== false;
    const notifyTelegram = body?.notifyTelegram !== false;
    const flaggedQuestionIds = Array.isArray(body?.flaggedQuestionIds)
      ? (body.flaggedQuestionIds as string[])
      : [];
    const hintQuestionIds = Array.isArray(body?.hintQuestionIds)
      ? (body.hintQuestionIds as string[])
      : [];

    if (!examId?.trim()) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }
    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "answers object (question_id -> text) is required" },
        { status: 400 }
      );
    }

    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);
    const rows = await loadQuestionsForExam(spreadsheetId, examId.trim());
    if (rows.length === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const material = await findMaterial(spreadsheetId, rows[0].material_id);
    const materialTitle = material?.title ?? "";
    const materialContent = material?.content ?? "";
    const materialId = rows[0].material_id;

    const items = rows.map((row) => ({
      row,
      studentAnswer: String(answers[row.question_id] ?? "").trim(),
    }));

    const evaluation = await evaluateAnswers({
      materialTitle,
      materialContent,
      items,
    });

    const explanations: Record<string, string> = {};
    for (const row of rows) {
      explanations[row.question_id] = row.explanation;
    }

    const submissionId = crypto.randomUUID();
    const submitted_at = new Date().toISOString();

    if (persist) {
      const evaluationPayload = {
        evaluation,
        explanations,
      };
      await appendExamSubmission(spreadsheetId, {
        submission_id: submissionId,
        exam_id: examId.trim(),
        material_id: materialId,
        submitted_at,
        answers_json: JSON.stringify(answers),
        evaluation_json: JSON.stringify(evaluationPayload),
        flagged_question_ids: JSON.stringify(flaggedQuestionIds),
        hint_question_ids: JSON.stringify(hintQuestionIds),
      });

      if (notifyTelegram) {
        try {
          await notifyExamSubmissionTelegram({
            examId: examId.trim(),
            materialTitle,
            submissionId,
            evaluation,
          });
        } catch (err) {
          console.error("Telegram notification failed (submission still saved):", err);
        }
      }
    }

    return NextResponse.json({
      examId: examId.trim(),
      submissionId: persist ? submissionId : undefined,
      submitted_at: persist ? submitted_at : undefined,
      evaluation,
      explanations,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/examination/evaluate:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
