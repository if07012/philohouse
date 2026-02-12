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
}): Record<string, string | number | any> {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  return {
    "Order ID": order.orderId,
    "Order Date": order.orderDate,
    "Customer Name": order.customer.name,
    WhatsApp: order.customer.whatsapp,
    Address: order.customer.address,
    Note: order.customer.note || "",
    "Order Type": typeLabel,
    Items: order.items,
    Total: order.total,
  };
}

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
    image: "https://placehold.co/200x200/ef476f/fff?text=Choc+Chip",
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
    image: "https://placehold.co/200x200/26547c/fff?text=Oatmeal",
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
    image: "https://placehold.co/200x200/ffd166/333?text=Butter",
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
    image: "https://placehold.co/200x200/ef476f/fff?text=Peanut",
    basePrice: 48000,
    sizePrices: {
      "400ml": 48000,
      "600ml": 72000,
      "800ml": 96000,
    },
  },
];
