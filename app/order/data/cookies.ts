import type { CookieProduct, SizeOption } from "../types";

// Store WhatsApp number (with country code, no + or 0). Replace with your business number.
export const STORE_WHATSAPP_NUMBER = "6285659763336";

// Google Sheet ID for order storage. Get from the sheet URL: .../d/SHEET_ID/edit
// Option 1: Set NEXT_PUBLIC_GOOGLE_SHEET_ID in .env.local
// Option 2: Replace the empty string below with your Sheet ID
export const GOOGLE_SHEET_ID =
  (typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_GOOGLE_SHEET_ID) ||
  "";

/**
 * Normalize WhatsApp number: if it starts with 0, replace with +62
 * Examples: "081234567890" -> "+6281234567890", "+6281234567890" -> "+6281234567890"
 */
export function normalizeWhatsAppNumber(whatsapp: string): string {
  const cleaned = whatsapp.trim();
  if (cleaned.startsWith("0")) {
    return "+62" + cleaned.substring(1);
  }
  // If it already starts with +62 or 62, return as is (or normalize 62 to +62)
  if (cleaned.startsWith("62") && !cleaned.startsWith("+62")) {
    return "+" + cleaned;
  }
  if (cleaned.startsWith("+62")) {
    return cleaned;
  }
  // If it doesn't start with 0, 62, or +62, assume it's already normalized or add +62
  return cleaned.startsWith("+") ? cleaned : "+62" + cleaned;
}

export function buildWhatsAppOrderMessage(order: {
  orderId: string;
  orderDate: string;
  customer: { name: string; whatsapp: string; address: string; note: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
}): string {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  let msg = `*Cookie Order - ${order.orderId}*\n\n`;
  msg += `*Order Info*\n`;
  msg += `Order ID: ${order.orderId}\n`;
  msg += `Order Date: ${order.orderDate}\n`;
  msg += `Order Type: ${typeLabel}\n\n`;
  msg += `*Customer*\n`;
  msg += `Name: ${order.customer.name}\n`;
  msg += `WhatsApp: ${order.customer.whatsapp}\n`;
  msg += `Address: ${order.customer.address}\n`;
  if (order.customer.note?.trim()) {
    msg += `Note: ${order.customer.note}\n`;
  }
  msg += `\n*Items*\n`;
  order.items.forEach(
    (item) =>
      (msg += `• ${item.name} ${item.size} x ${item.quantity} = Rp ${item.subtotal.toLocaleString("id-ID")}\n`)
  );
  msg += `\n*Total: Rp ${order.total.toLocaleString("id-ID")}*`;
  return msg;
}

export function buildSheetRow(order: {
  orderId: string;
  orderDate: string;
  customer: { name: string; whatsapp: string; address: string; note: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
}): Record<string, string | number> {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  const itemsStr = order.items
    .map(
      (i) =>
        `${i.name} ${i.size} x ${i.quantity} = Rp ${i.subtotal.toLocaleString("id-ID")}`
    )
    .join(" | ");
  // Normalize WhatsApp number: replace 0 with +62
  const normalizedWhatsApp = normalizeWhatsAppNumber(order.customer.whatsapp);
  return {
    "Order ID": order.orderId,
    "Order Date": order.orderDate,
    "Customer Name": order.customer.name,
    WhatsApp: normalizedWhatsApp,
    Address: order.customer.address,
    Note: order.customer.note || "",
    "Order Type": typeLabel,
    Items: itemsStr,
    Total: order.total,
  };
}

/** One row per cookie item for the "Cookie Details" sheet */
export function buildCookieDetailRows(order: {
  orderId: string;
  customer: { name: string };
  items: { name: string; size: string; quantity: number; subtotal: number }[];
}): Record<string, string | number>[] {
  return order.items.map((item) => ({
    "Order ID": order.orderId,
    "Customer Name": order.customer.name,
    "Cookie Name": item.name,
    Size: item.size,
    Quantity: item.quantity,
    Subtotal: item.subtotal,
  }));
}

/** Spin wheel: every Rp 500,000 = 1 spin chance */
export const SPIN_THRESHOLD = 100_000;

export function getSpinChances(total: number): number {
  return Math.floor(total / SPIN_THRESHOLD);
}

export interface SpinPrize {
  id: string;
  label: string;
  type: "discount" | "cookie";
  value?: string; // e.g. "10%", "Chocolate Chip 400ml"
}

/** Row for "Spin Rewards" sheet */
export function buildSpinResultRow(data: {
  orderId: string;
  customerName: string;
  gift: string;
}): Record<string, string> {
  return {
    "Order ID": data.orderId,
    "Customer Name": data.customerName,
    Gift: data.gift,
  };
}

export const SPIN_PRIZES: SpinPrize[] = [
  { id: "d10", label: "10% Off", type: "discount", value: "10%" },
  { id: "d5", label: "5% Off", type: "discount", value: "5%" },
  { id: "cookie1", label: "Free Cookie 400ml", type: "cookie", value: "Any 400ml" },
  { id: "d15", label: "15% Off", type: "discount", value: "15%" },
  { id: "try", label: "Try Again", type: "discount" },
  { id: "cookie2", label: "Free Oatmeal Cookie", type: "cookie", value: "Oatmeal 400ml" },
  { id: "d20", label: "20% Off", type: "discount", value: "20%" },
  { id: "cookie3", label: "Free Choc Chip", type: "cookie", value: "Choc Chip 400ml" },
];

export const SIZE_OPTIONS: SizeOption[] = ["400ml", "600ml", "800ml"];

// Size price multipliers: 400ml = 1x, 600ml = 1.5x, 800ml = 2x
export const SIZE_MULTIPLIERS: Record<SizeOption, number> = {
  "400ml": 1,
  "600ml": 1.5,
  "800ml": 2,
};

export const COOKIE_PRODUCTS: CookieProduct[] = [
  {
    id: "choc-chip",
    name: "Chocolate Chip Cookies",
    image: "/cookies/choco-chip.jpg",
    basePrice: 50000,
    sizePrices: {
      "400ml": 50000,
      "600ml": 75000,
      "800ml": 100000,
    },
  },
  {
    id: "oatmeal-raisin",
    name: "Oatmeal Raisin Cookies",
    image: "/cookies/oatmeal-raisin.png",
    basePrice: 45000,
    sizePrices: {
      "400ml": 45000,
      "600ml": 67500,
      "800ml": 90000,
    },
  },
  {
    id: "butter-scotch",
    name: "Butter Scotch Cookies",
    image: "/cookies/butter-scotch.jpg",
    basePrice: 55000,
    sizePrices: {
      "400ml": 55000,
      "600ml": 82500,
      "800ml": 110000,
    },
  },
  {
    id: "peanut-butter",
    name: "Peanut Butter Cookies",
    image: "/cookies/peanut-butter.jpg",
    basePrice: 48000,
    sizePrices: {
      "400ml": 48000,
      "600ml": 72000,
      "800ml": 96000,
    },
  },
];
