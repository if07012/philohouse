import { NextResponse } from "next/server";
import {
  ensureQuizSheets,
  getHistoryForUser,
  listQuizItemsForUser,
} from "@/app/quiz/lib/sheetHelpers";
import { getQuizSpreadsheetId } from "@/app/quiz/lib/env";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const spreadsheetId = getQuizSpreadsheetId();
    await ensureQuizSheets(spreadsheetId);

    const list = searchParams.get("list") === "1";
    if (list) {
      const quizzes = await listQuizItemsForUser(userId, spreadsheetId);
      return NextResponse.json({ quizzes });
    }

    const history = await getHistoryForUser(
      userId,
      {
        quizTitle: searchParams.get("quizTitle") ?? undefined,
        dateFrom: searchParams.get("dateFrom") ?? undefined,
        dateTo: searchParams.get("dateTo") ?? undefined,
        minScore: searchParams.get("minScore")
          ? Number(searchParams.get("minScore"))
          : undefined,
      },
      spreadsheetId
    );

    return NextResponse.json({ history });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
