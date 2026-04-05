import { NextResponse } from "next/server";
import { checkStudentAnswer } from "@/app/examination/lib/answerCheck";
import { getGrade4ExamSpreadsheetId } from "@/app/examination/lib/env";
import { notifyExamCheckAnswerTelegram } from "@/app/examination/lib/examTelegramNotify";
import {
  ensureExamSheets,
  findMaterial,
  loadQuestionsForExam,
} from "@/app/examination/lib/sheetHelpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const examId = body?.examId as string | undefined;
    const questionId = body?.questionId as string | undefined;
    const answer =
      body?.answer === undefined || body?.answer === null
        ? ""
        : String(body.answer);

    if (!examId?.trim()) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }
    if (!questionId?.trim()) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);
    const rows = await loadQuestionsForExam(spreadsheetId, examId.trim());
    const row = rows.find((r) => r.question_id === questionId.trim());
    if (!row) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const materialPromise = findMaterial(spreadsheetId, row.material_id);
    const { correct } = checkStudentAnswer(row, answer);

    try {
      const material = await materialPromise;
      await notifyExamCheckAnswerTelegram({
        examId: examId.trim(),
        materialId: row.material_id,
        materialTitle: material?.title ?? "",
        questionId: row.question_id,
        orderIndex: row.order_index,
        questionType: row.type,
        questionText: row.question_text,
        studentAnswer: answer,
        optionsJson: row.options_json || "[]",
        correct,
      });
    } catch (err) {
      console.error("check-answer Telegram notify failed (answer still saved):", err);
    }

    return NextResponse.json({
      correct,
      questionType: row.type,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/examination/check-answer:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
