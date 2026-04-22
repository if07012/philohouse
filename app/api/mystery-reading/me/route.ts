import { NextResponse } from "next/server";
import { getMysterySession } from "@/app/mystery-reading/lib/apiAuth";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  ensureMysterySheets,
  findFamilyById,
  listChildrenByFamily,
} from "@/app/mystery-reading/lib/sheetHelpers";

export async function GET() {
  try {
    const session = await getMysterySession();
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);
    const family = await findFamilyById(spreadsheetId, session.familyId);
    const children = await listChildrenByFamily(spreadsheetId, session.familyId);

    return NextResponse.json({
      authenticated: true,
      familyId: session.familyId,
      parentLabel: family?.parent_label || "",
      children: children.map((c) => ({
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
