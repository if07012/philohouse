import { NextResponse } from "next/server";
import { getGoogleSheet } from "../../../lib/googleSheets";
import { GOOGLE_SHEET_ID } from "../../../order/data/cookies";

// Google Sheet tab names: max 100 chars, cannot contain \ / ? * [ ]
function sanitizeSheetName(orderId: string): string {
  return orderId.replace(/[\\/?*[\]]/g, "_").slice(0, 100);
}

export interface InvoiceSaveBody {
  orderId: string;
  order: {
    "Order ID": string;
    "Order Date": string;
    "Customer Name": string;
    WhatsApp: string;
    Address: string;
    Note?: string;
    "Order Type": string;
    Total: number;
    cookieDetails: Array<{
      "Cookie Name": string;
      Size: string;
      Quantity: number;
      Subtotal: number;
    }>;
  };
  extraItems?: Array<{ name: string; quantity: number; unitPrice: number }>;
  discount?: { type: "percent" | "fixed"; value: number };
  subtotal: number;
  discountAmount: number;
  total: number;
}

export async function POST(request: Request) {
  try {
    if (!GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { error: "Google Sheet not configured" },
        { status: 500 }
      );
    }

    const body: InvoiceSaveBody = await request.json();
    const {
      orderId,
      order,
      extraItems = [],
      discount,
      subtotal,
      discountAmount,
      total,
    } = body;

    if (!orderId || !order) {
      return NextResponse.json(
        { error: "orderId and order are required" },
        { status: 400 }
      );
    }

    const sheetName = sanitizeSheetName(orderId);
    const doc = await getGoogleSheet(GOOGLE_SHEET_ID);

    // Delete existing sheet with same name so we can replace with fresh data
    const existing = doc.sheetsByTitle[sheetName];
    if (existing) {
      await existing.delete();
    }

    const headers = ["Col1", "Col2", "Col3", "Col4"];
    const rows: Record<string, string | number>[] = [];

    rows.push({ Col1: "INVOICE", Col2: "", Col3: "", Col4: "" });
    rows.push({ Col1: "Order ID", Col2: order["Order ID"], Col3: "", Col4: "" });
    rows.push({
      Col1: "Date",
      Col2: order["Order Date"] || "",
      Col3: "",
      Col4: "",
    });
    rows.push({
      Col1: "Customer",
      Col2: order["Customer Name"] || "",
      Col3: "",
      Col4: "",
    });
    rows.push({
      Col1: "WhatsApp",
      Col2: order.WhatsApp || "",
      Col3: "",
      Col4: "",
    });
    rows.push({
      Col1: "Address",
      Col2: order.Address || "",
      Col3: "",
      Col4: "",
    });
    if (order.Note) {
      rows.push({ Col1: "Note", Col2: order.Note, Col3: "", Col4: "" });
    }
    rows.push({ Col1: "", Col2: "", Col3: "", Col4: "" });
    rows.push({
      Col1: "Item",
      Col2: "Size",
      Col3: "Qty",
      Col4: "Subtotal",
    });

    for (const c of order.cookieDetails || []) {
      rows.push({
        Col1: c["Cookie Name"] || "",
        Col2: c.Size || "",
        Col3: Number(c.Quantity) || 0,
        Col4: Number(c.Subtotal) || 0,
      });
    }
    for (const item of extraItems) {
      const itemSubtotal = item.quantity * item.unitPrice;
      rows.push({
        Col1: item.name,
        Col2: "-",
        Col3: item.quantity,
        Col4: itemSubtotal,
      });
    }

    rows.push({ Col1: "", Col2: "", Col3: "", Col4: "" });
    rows.push({
      Col1: "Subtotal",
      Col2: "",
      Col3: "",
      Col4: subtotal,
    });
    if (discountAmount > 0) {
      rows.push({
        Col1: "Diskon",
        Col2: discount?.type === "percent" ? `${discount.value}%` : "",
        Col3: "",
        Col4: -discountAmount,
      });
    }
    rows.push({
      Col1: "Total",
      Col2: "",
      Col3: "",
      Col4: total,
    });

    const newSheet = await doc.addSheet({
      title: sheetName,
      headerValues: headers,
    });
    await newSheet.addRows(rows);

    return NextResponse.json({
      success: true,
      message: "Invoice saved to Google Sheet",
      sheetName,
    });
  } catch (error) {
    console.error("Error saving invoice to sheet:", error);
    return NextResponse.json(
      { error: "Failed to save invoice to sheet" },
      { status: 500 }
    );
  }
}
