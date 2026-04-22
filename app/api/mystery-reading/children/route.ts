import { NextResponse } from "next/server";
import crypto from "crypto";
import { getMysterySession } from "@/app/mystery-reading/lib/apiAuth";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  appendChildRow,
  ensureMysterySheets,
  listChildrenByFamily,
} from "@/app/mystery-reading/lib/sheetHelpers";

export async function GET() {
  const session = await getMysterySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);
    const rows = await listChildrenByFamily(spreadsheetId, session.familyId);
    return NextResponse.json({
      children: rows.map((c) => ({
        child_id: c.child_id,
        nickname: c.nickname,
        xp: Number(c.xp) || 0,
        level: Number(c.level) || 1,
        current_streak: Number(c.current_streak) || 0,
        longest_streak: Number(c.longest_streak) || 0,
        last_completed_date: c.last_completed_date || "",
        badges_json: c.badges_json || "[]",
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getMysterySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const nickname = String(body?.nickname || "").trim();
    if (!nickname) {
      return NextResponse.json({ error: "nickname wajib" }, { status: 400 });
    }

    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);

    const childId = crypto.randomUUID();
    await appendChildRow(spreadsheetId, {
      child_id: childId,
      family_id: session.familyId,
      nickname,
      xp: "0",
      level: "1",
      current_streak: "0",
      longest_streak: "0",
      last_completed_date: "",
      badges_json: "[]",
      rolling_avg_score: "0",
    });

    return NextResponse.json({ ok: true, childId, nickname });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
