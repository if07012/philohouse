import { NextResponse } from "next/server";

export const maxDuration = 120;
import { generateExamQuestionRows } from "@/app/examination/lib/examGeneration";
import {
  getExamLlmProvider,
  getGrade4ExamSpreadsheetId,
  parseExamLlmProvider,
} from "@/app/examination/lib/env";
import {
  appendExamMeta,
  appendQuestionRows,
  ensureExamSheets,
  findMaterial,
  listPriorQuestionTextsForMaterial,
} from "@/app/examination/lib/sheetHelpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const materialId = body?.materialId as string | undefined;
    if (!materialId?.trim()) {
      return NextResponse.json(
        { error: "materialId is required" },
        { status: 400 }
      );
    }

    const fromBody = parseExamLlmProvider(body?.llmProvider);
    const llmProvider = fromBody ?? getExamLlmProvider();
    if (body?.llmProvider != null && fromBody == null) {
      return NextResponse.json(
        { error: 'llmProvider must be "groq" or "ollama"' },
        { status: 400 }
      );
    }

    const spreadsheetId = getGrade4ExamSpreadsheetId();
    await ensureExamSheets(spreadsheetId);

    const material = await findMaterial(spreadsheetId, materialId.trim());
    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    const priorQuestionTexts = await listPriorQuestionTextsForMaterial(
      spreadsheetId,
      material.material_id
    );
    const { examId, rows } = await generateExamQuestionRows(
      material,
      priorQuestionTexts,
      { llmProvider }
    );

    const created_at = new Date().toISOString();
    await appendExamMeta(spreadsheetId, {
      exam_id: examId,
      material_id: material.material_id,
      material_title: material.title,
      created_at,
    });
    await appendQuestionRows(spreadsheetId, rows);

    return NextResponse.json({
      examId,
      questionCount: rows.length,
      materialTitle: material.title,
      created_at,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/examination/generate:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
