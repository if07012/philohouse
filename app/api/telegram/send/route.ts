import { NextResponse } from "next/server";
import { sendTelegramHtmlMessage } from "@/app/lib/telegramSend";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await sendTelegramHtmlMessage(message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        sent: result.sent,
      });
    }

    if (result.error === "Telegram not configured") {
      console.error("Telegram credentials not configured");
      return NextResponse.json(
        { error: "Telegram not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: result.error || "Failed to send Telegram message" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return NextResponse.json(
      { error: "Failed to send Telegram message" },
      { status: 500 }
    );
  }
}
