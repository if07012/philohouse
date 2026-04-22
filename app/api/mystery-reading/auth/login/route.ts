import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  ensureMysterySheets,
  findFamilyById,
} from "@/app/mystery-reading/lib/sheetHelpers";
import { createSessionToken } from "@/app/mystery-reading/lib/session";
import { setMysterySessionCookie } from "@/app/mystery-reading/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const familyId = String(body?.familyId || "").trim();
    const pin = String(body?.pin || "").trim();
    if (!familyId || !pin) {
      return NextResponse.json(
        { error: "familyId dan pin wajib" },
        { status: 400 }
      );
    }

    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);

    const family = await findFamilyById(spreadsheetId, familyId);
    if (!family?.pin_hash) {
      return NextResponse.json({ error: "Keluarga tidak ditemukan" }, { status: 401 });
    }

    const ok = await compare(pin, family.pin_hash);
    if (!ok) {
      return NextResponse.json({ error: "PIN salah" }, { status: 401 });
    }

    const token = createSessionToken(familyId);
    await setMysterySessionCookie(token);

    return NextResponse.json({
      ok: true,
      familyId,
      parentLabel: family.parent_label || "",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
