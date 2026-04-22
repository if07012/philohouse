import { NextResponse } from "next/server";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  ensureMysterySheets,
  getDailyByDate,
  getQuizByDate,
} from "@/app/mystery-reading/lib/sheetHelpers";
import type {
  CharacterBrief,
  MysteryQuizQuestion,
  PublicMysteryQuizQuestion,
} from "@/app/mystery-reading/lib/types";

function stripQuiz(q: MysteryQuizQuestion): PublicMysteryQuizQuestion {
  return {
    question_id: q.question_id,
    kind: q.kind,
    question: q.question,
    options: q.options,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await context.params;
    const storyDate = decodeURIComponent(date || "").trim();


    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);

    const daily = await getDailyByDate(spreadsheetId, storyDate);
    if (!daily?.content_md) {
      return NextResponse.json(
        { error: "Cerita untuk tanggal ini belum tersedia." },
        { status: 404 }
      );
    }

    const quizRow = await getQuizByDate(spreadsheetId, storyDate);
    let questions: PublicMysteryQuizQuestion[] = [];
    if (quizRow?.questions_json) {
      try {
        const full = JSON.parse(quizRow.questions_json) as MysteryQuizQuestion[];
        if (Array.isArray(full)) {
          questions = full.map(stripQuiz);
        }
      } catch {
        questions = [];
      }
    }

    let clues: string[] = [];
    let characters: CharacterBrief[] = [];
    try {
      clues = JSON.parse(daily.clues_json || "[]");
    } catch {
      clues = [];
    }
    try {
      characters = JSON.parse(daily.characters_json || "[]");
    } catch {
      characters = [];
    }

    return NextResponse.json({
      story_date: storyDate,
      title: daily.title,
      summary: daily.summary,
      content_md: daily.content_md,
      clues,
      characters,
      image_url: daily.image_url || "",
      difficulty_band: daily.difficulty_band || "",
      quiz: { questions },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
