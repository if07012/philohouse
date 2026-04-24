import { NextResponse } from "next/server";
import { clearAllGoogleSheetsCache } from "@/app/lib/googleSheets";

export async function GET(request: Request) {
  const required = process.env.CACHE_ADMIN_TOKEN;
  if (!required) {
    return NextResponse.json(
      { error: "CACHE_ADMIN_TOKEN belum diset" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const got = url.searchParams.get("token");
  if (!got || got !== required) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = clearAllGoogleSheetsCache();
  return NextResponse.json({ ok: true, ...result });
}

