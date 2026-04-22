import { NextResponse } from "next/server";
import { getMysterySession } from "@/app/mystery-reading/lib/apiAuth";
import { aggregateAttemptsForChild } from "@/app/mystery-reading/lib/analytics";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  ensureMysterySheets,
  listAttemptsByChild,
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

    const children = await listChildrenByFamily(spreadsheetId, session.familyId);
    const analytics = await Promise.all(
      children.map(async (c) => {
        const attempts = await listAttemptsByChild(spreadsheetId, c.child_id);
        return aggregateAttemptsForChild({
          childId: c.child_id,
          nickname: c.nickname || "Anak",
          attemptRows: attempts,
        });
      })
    );

    return NextResponse.json({ children: analytics });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
