import { NextResponse } from "next/server";
import crypto from "crypto";
import { hash } from "bcryptjs";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  appendFamilyRow,
  ensureMysterySheets,
} from "@/app/mystery-reading/lib/sheetHelpers";
import { createSessionToken } from "@/app/mystery-reading/lib/session";
import { setMysterySessionCookie } from "@/app/mystery-reading/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parentLabel = String(body?.parentLabel || "").trim();
    const pin = String(body?.pin || "").trim();
    if (!parentLabel || pin.length < 4) {
      return NextResponse.json(
        { error: "parentLabel dan PIN (min 4 digit) wajib diisi" },
        { status: 400 }
      );
    }

    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);

    const familyId = crypto.randomUUID();
    const pin_hash = await hash(pin, 10);
    const created_at = new Date().toISOString();

    await appendFamilyRow(spreadsheetId, {
      family_id: familyId,
      parent_label: parentLabel,
      pin_hash,
      created_at,
    });

    const token = createSessionToken(familyId);
    await setMysterySessionCookie(token);

    return NextResponse.json({
      ok: true,
      familyId,
      message: "Simpan Family ID untuk login berikutnya.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
