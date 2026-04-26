import { NextResponse } from "next/server";
import { appendSheetData, clearSheetData, ensureSheetWithHeaders, getGoogleSheet, readSheetData } from "@/app/lib/googleSheets";
import {
  extractMaterialTexts,
  generateQuestionsAndStatementsFromMaterials,
} from "@/app/translation-training/lib/generateFromMaterials";
import {
  getMaterialListSheetName,
  getTranslationAttemptSheetName,
  getTranslationSheetName,
  getTranslationSpreadsheetId,
} from "@/app/translation-training/lib/env";
import { sendTelegramHtmlMessage } from "@/app/lib/telegramSend";

export const maxDuration = 120;

export async function GET() {
  try {
    const spreadsheetId = getTranslationSpreadsheetId();
    const listSheetName = getMaterialListSheetName();
    const translationSheetName = getTranslationSheetName();
    const clearAttemptSheetName = getTranslationAttemptSheetName();
    const doc = await getGoogleSheet(spreadsheetId);
    const listSheet = doc.sheetsByTitle[listSheetName];
    if (!listSheet) {
      return NextResponse.json(
        { error: `Sheet "${listSheetName}" tidak ditemukan di spreadsheet.` },
        { status: 404 }
      );
    }

    const rows = await listSheet.getRows();
    const objects = rows.map((r) => r.toObject() as Record<string, unknown>);
    const materialTexts = extractMaterialTexts(objects);

    const previousRows = (await readSheetData(
      spreadsheetId,
      translationSheetName
    )) as Record<string, unknown>[];
    const recentEnglishLines = previousRows
      .map((r) => String(r.english ?? "").trim())
      .filter(Boolean)
      .slice(-80);

    const { questions, statements } = await generateQuestionsAndStatementsFromMaterials({
      materialTexts,
      recentEnglishLines,
    });

    await ensureSheetWithHeaders(spreadsheetId, translationSheetName, [
      "english",
      "indonesian",
    ]);

    const toAppend = [...questions, ...statements].map((english) => ({
      english,
      indonesian: "",
    }));
    const attempsPrevious = await readSheetData(spreadsheetId, clearAttemptSheetName);
    if(attempsPrevious.length > 0) {
      const result = await sendTelegramHtmlMessage(normalizePreviousAttempts(attempsPrevious), false);
      if (!result.success) {
        console.error("Failed to send Telegram message:", result.error);
      }
    }
    await clearSheetData(spreadsheetId, translationSheetName);
    await clearSheetData(spreadsheetId, clearAttemptSheetName);
    await appendSheetData(spreadsheetId, toAppend, translationSheetName);

    return NextResponse.json({
      ok: true,
      appended: toAppend.length,
      questions,
      statements,
      translationSheetName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/translation-training/generate-from-materials:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
function normalizePreviousAttempts(
  attempsPrevious: Partial<Record<string, unknown>>[]
): string {
  return `Tanggal : ${new Date().toLocaleDateString()}\n${attempsPrevious.map((attempt) => `    
    English: ${attempt.english}
    Indonesian: ${attempt.student_indonesian}
    Score: ${attempt.score_percent}
  `).join("\n")}`;
}

