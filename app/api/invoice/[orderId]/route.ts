import { NextResponse } from "next/server";
import { getGoogleSheet } from "../../../lib/googleSheets";
import { GOOGLE_SHEET_ID } from "../../../order/data/cookies";

function sanitizeSheetName(orderId: string): string {
  return orderId.replace(/[\\/?*[\]]/g, "_").slice(0, 100);
}

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

    const sheetName = sanitizeSheetName(orderId);
    const doc = await getGoogleSheet(GOOGLE_SHEET_ID);
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const rows = await sheet.getRows();
    const data = rows.map((row: any) => row.toObject());

    // Parse Col1, Col2, Col3, Col4 format
    let orderIdVal = "";
    let orderDate = "";
    let customerName = "";
    let whatsapp = "";
    let address = "";
    let note = "";
    let orderType = "";
    const cookieDetails: Array<{ "Cookie Name": string; Size: string; Quantity: number; Subtotal: number }> = [];
    const extraItems: Array<{ name: string; quantity: number; unitPrice: number }> = [];
    let subtotal = 0;
    let discountAmount = 0;
    let total = 0;
    let discountType: "percent" | "fixed" = "percent";
    let discountValue = 0;

    let inItems = false;
    for (const row of data) {
      const c1 = String(row.Col1 || "").trim();
      const c2 = String(row.Col2 ?? "");
      const c3 = row.Col3;
      const c4 = row.Col4;

      if (c1 === "Order ID") {
        orderIdVal = String(c2);
      } else if (c1 === "Date") {
        orderDate = String(c2);
      } else if (c1 === "Customer") {
        customerName = String(c2);
      } else if (c1 === "WhatsApp") {
        whatsapp = String(c2);
      } else if (c1 === "Address") {
        address = String(c2);
      } else if (c1 === "Note") {
        note = String(c2);
      } else if (c1 === "Order Type") {
        orderType = String(c2);
      } else if (c1 === "Item" && c2 === "Size" && c3 === "Qty") {
        inItems = true;
      } else if (inItems && c1 && c1 !== "Subtotal" && c1 !== "Diskon" && c1 !== "Total") {
        const qty = Number(c3) || 0;
        const subtotalVal = Number(c4) || 0;
        if (c2 === "-" || c2 === "") {
          // Extra item
          extraItems.push({
            name: c1,
            quantity: qty,
            unitPrice: qty > 0 ? subtotalVal / qty : 0,
          });
        } else {
          cookieDetails.push({
            "Cookie Name": c1,
            Size: String(c2),
            Quantity: qty,
            Subtotal: subtotalVal,
          });
        }
      } else if (c1 === "Subtotal") {
        inItems = false;
        subtotal = Number(c4) || 0;
      } else if (c1 === "Diskon") {
        discountAmount = Math.abs(Number(c4) || 0);
        const percentMatch = String(c2).match(/(\d+)\s*%/);
        if (percentMatch) {
          discountType = "percent";
          discountValue = Number(percentMatch[1]) || 0;
        } else {
          discountType = "fixed";
          discountValue = discountAmount;
        }
      } else if (c1 === "Total") {
        total = Number(c4) || 0;
      }
    }

    return NextResponse.json({
      order: {
        "Order ID": orderIdVal,
        "Order Date": orderDate,
        "Customer Name": customerName,
        WhatsApp: whatsapp,
        Address: address,
        Note: note || "",
        "Order Type": orderType || "Single (Satuan)",
        Total: total,
        cookieDetails,
      },
      extraItems,
      discount:
        discountAmount > 0
          ? { type: discountType, value: discountValue }
          : undefined,
      subtotal,
      discountAmount,
      total,
    });
  } catch (error) {
    console.error("Error reading invoice:", error);
    return NextResponse.json(
      { error: "Failed to read invoice" },
      { status: 500 }
    );
  }
}
