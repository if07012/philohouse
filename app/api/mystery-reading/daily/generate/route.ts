import { NextResponse } from "next/server";
import { jakartaDateString } from "@/app/mystery-reading/lib/dateJakarta";
import {
  getMysteryCronSecret,
  getMysterySpreadsheetId,
} from "@/app/mystery-reading/lib/mysteryEnv";
import { generateAiSdkCoverToPublic } from "@/app/mystery-reading/lib/aiSdkImage";
import { generateDailyMysteryPackage } from "@/app/mystery-reading/lib/storyGeneration";
import {
  ensureMysterySheets,
  upsertDailyRow,
  upsertQuizRow,
} from "@/app/mystery-reading/lib/sheetHelpers";

export const maxDuration = 300;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function verifyCron(request: Request): boolean {
  const secret = getMysteryCronSecret();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const key = new URL(request.url).searchParams.get("key");
  return key === secret;
}

function resolveStoryDate(
  request: Request,
  body: Record<string, unknown>
): string | null {
  const fromBody = body?.storyDate;
  if (typeof fromBody === "string" && DATE_RE.test(fromBody.trim())) {
    return fromBody.trim();
  }
  const q = new URL(request.url).searchParams.get("storyDate");
  if (q && DATE_RE.test(q.trim())) return q.trim();
  return null;
}

export async function GET(request: Request) {
  return handleGenerate(request, {});
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return handleGenerate(request, body);
}

async function handleGenerate(
  request: Request,
  body: Record<string, unknown>
) {
  try {
    if (!verifyCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);

    const storyDate = resolveStoryDate(request, body) ?? jakartaDateString();

    const pkg = await generateDailyMysteryPackage({
      storyDate,
      difficultyBand: "menengah",
    });

    let imageUrl = pkg.image_url;
    const localCover = await generateAiSdkCoverToPublic({
      promptEn: pkg.image_prompt,
      storyDate,
    });
    if (localCover) {
      imageUrl = localCover;
    }

    await upsertDailyRow(spreadsheetId, {
      story_date: storyDate,
      title: pkg.title,
      summary: pkg.summary,
      content_md: pkg.content_md,
      clues_json: JSON.stringify(pkg.clues),
      characters_json: JSON.stringify(pkg.characters),
      image_prompt: pkg.image_prompt,
      image_url: imageUrl,
      difficulty_band: "menengah",
      generated_at: new Date().toISOString(),
      openai_model: pkg.openai_model,
    });

    await upsertQuizRow(spreadsheetId, {
      story_date: storyDate,
      questions_json: JSON.stringify(pkg.questions),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      storyDate,
      title: pkg.title,
      questionCount: pkg.questions.length,
      replaced: true,
      imageUrl,
      coverSavedToPublic: Boolean(localCover),
      imageProvider: "ai-sdk",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("mystery-reading daily generate:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
