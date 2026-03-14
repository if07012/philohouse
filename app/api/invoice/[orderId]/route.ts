import { NextResponse } from "next/server";
import { GOOGLE_SHEET_ID } from "../../../order/data/cookies";
import { getInvoiceByOrderId } from "../../../order/lib/invoiceServer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { error: "Google Sheet not configured" },
        { status: 500 }
      );
    }

    const data = await getInvoiceByOrderId(orderId);
    if (!data) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading invoice:", error);
    return NextResponse.json(
      { error: "Failed to read invoice" },
      { status: 500 }
    );
  }
}
