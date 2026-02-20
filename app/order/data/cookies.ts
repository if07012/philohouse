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

/**
 * Build plain text message for WhatsApp (same content as Telegram but without HTML)
 */
function buildWhatsAppMessageText(order: {
  orderId: string;
  orderDate: string;
  customer: { name: string; whatsapp: string; address: string; note: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
  gifts?: string[];
}): string {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  const normalizedWhatsApp = normalizeWhatsAppNumber(order.customer.whatsapp);
  
  let msg = `New Cookie Order - ${order.orderId}\n\n`;
  
  msg += `Order Info\n`;
  msg += `Order ID: ${order.orderId}\n`;
  msg += `Order Date: ${order.orderDate}\n`;
  msg += `Order Type: ${typeLabel}\n\n`;
  
  msg += `Customer Information\n`;
  msg += `Name: ${order.customer.name}\n`;
  msg += `WhatsApp: ${normalizedWhatsApp}\n`;
  msg += `Address: ${order.customer.address}\n`;
  if (order.customer.note?.trim()) {
    msg += `Note: ${order.customer.note}\n`;
  }
  msg += `\n`;
  
  msg += `Cookie Details\n`;
  order.items.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} ${item.size}\n`;
    msg += `   Quantity: ${item.quantity}\n`;
    msg += `   Subtotal: Rp ${item.subtotal.toLocaleString("id-ID")}\n`;
    if (index < order.items.length - 1) msg += `\n`;
  });
  msg += `\n`;
  
  msg += `Total: Rp ${order.total.toLocaleString("id-ID")}\n`;
  
  if (order.gifts && order.gifts.length > 0) {
    msg += `\nGifts Won\n`;
    order.gifts.forEach((gift, index) => {
      msg += `${index + 1}. ${gift}\n`;
    });
  }
  
  return msg;
}

export function buildTelegramOrderMessage(order: {
  orderId: string;
  orderDate: string;
  customer: { name: string; whatsapp: string; address: string; note: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
  gifts?: string[];
}): string {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  const normalizedWhatsApp = normalizeWhatsAppNumber(order.customer.whatsapp);
  
  let msg = `<b>New Cookie Order - ${order.orderId}</b>\n\n`;
  
  msg += `<b>Order Info</b>\n`;
  msg += `Order ID: <code>${order.orderId}</code>\n`;
  msg += `Order Date: ${order.orderDate}\n`;
  msg += `Order Type: ${typeLabel}\n\n`;
  
  msg += `<b>Customer Information</b>\n`;
  msg += `Name: ${order.customer.name}\n`;
  msg += `WhatsApp: <code>${normalizedWhatsApp}</code>\n`;
  msg += `Address: ${order.customer.address}\n`;
  if (order.customer.note?.trim()) {
    msg += `Note: ${order.customer.note}\n`;
  }
  msg += `\n`;
  
  msg += `<b>Cookie Details</b>\n`;
  order.items.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} ${item.size} `;
    msg += `   Qty: ${item.quantity}\n`;
    if (index < order.items.length - 1) msg += `\n`;
  });
  msg += `\n`;
  
  
  if (order.gifts && order.gifts.length > 0) {
    msg += `\n<b>Gifts Won</b>\n`;
    order.gifts.forEach((gift, index) => {
      msg += `${index + 1}. ${gift}\n`;
    });
  }
  
  // Add WhatsApp link
  const whatsappMessageText = buildWhatsAppMessageText(order);
  const encodedMessage = encodeURIComponent(whatsappMessageText);
  const whatsappUrl = `https://wa.me/${normalizedWhatsApp}?text=${encodedMessage}`;
  
  msg += `\n\n<a href="${whatsappUrl}">Send to WhatsApp</a>`;
  
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
  { id: "d5", label: "5% Off", type: "discount", value: "5%" },
  { id: "d5n", label: "5% Off <br/> for Next order", type: "discount", value: "5%" },
  { id: "cookie1", label: "Free Cookie 400ml", type: "cookie", value: "Any 400ml" },
  { id: "brownies", label: "Brownies Slice Mini", type: "cookie", value: "Brownies Slice Mini" },
  { id: "d10n", label: "10% Off <br/>for Next order", type: "discount", value: "10%" },
  { id: "ongkir", label: "Gratis Ongkir", type: "discount", value: "Gratis Ongkir" },
];

export const SIZE_OPTIONS: SizeOption[] = ["400ml", "600ml", "800ml", "Satuan"];

// Size price multipliers: 400ml = 1x, 600ml = 1.5x, 800ml = 2x
export const SIZE_MULTIPLIERS: Record<SizeOption, number> = {
  "400ml": 1,
  "600ml": 1.5,
  "800ml": 2,
  "Satuan": 1
};

export const COOKIE_PRODUCTS: CookieProduct[] = [
  {
    id: "nastar-klasik",
    name: "Nastar Klasik",
    image: "/cookies/nastar-klasik.jpg",
    basePrice: 60000,
    sizePrices: {
      "400ml": 60000,
      "600ml": 80000,
      "800ml": 100000,
    },
  },
  {
    id: "nastar-keju",
    name: "Nastar Keju",
    image: "/cookies/nastar_keju.jpeg",
    basePrice: 65000,
    sizePrices: {
      "400ml": 65000,
      "600ml": 90000,
      "800ml": 115000,
    },
  },
  {
    id: "cheese-garlic",
    name: "Cheese Garlic",
    image: "/cookies/cheese-garlic.jpeg",
    basePrice: 65000,
    sizePrices: {
      "400ml": 65000,
      "600ml": 85000,
      "800ml": 110000,
    },
  },
  {
    id: "sagu-keju",
    name: "Sagu Keju",
    image: "/cookies/sagu_keju.jpeg",
    basePrice: 65000,
    sizePrices: {
      "400ml": 65000,
      "600ml": 85000,
      "800ml": 110000,
    },
  },
  {
    id: "choco-nuteball",
    name: "Choco Nuteball",
    image: "/cookies/choco_nutball.jpeg",
    basePrice: 60000,
    sizePrices: {
      "400ml": 60000,
      "600ml": 80000,
      "800ml": 110000,
    },
  },
  {
    id: "kastengel",
    name: "Kastengel",
    image: "/cookies/krestangel.jpeg",
    basePrice: 70000,
    sizePrices: {
      "400ml": 70000,
      "600ml": 95000,
      "800ml": 125000,
    },
  },
  {
    id: "lidah-kucing-keju",
    name: "Lidah Kucing Keju",
    image: "/cookies/lidah_kucing.jpeg",
    basePrice: 65000,
    sizePrices: {
      "400ml": 65000,
    },
  },
  {
    id: "palm-cheese",
    name: "Palm Cheese",
    image: "/cookies/palm_cheese.jpeg",
    basePrice: 60000,
    sizePrices: {
      "400ml": 60000,
      "600ml": 80000,
      "800ml": 100000,
    },
  },
  {
    id: "putri-salju-mede",
    name: "Putri Saljut Mede",
    image: "/cookies/putri-salju.jpeg",
    basePrice: 60000,
    sizePrices: {
      "400ml": 60000,
      "600ml": 80000,
      "800ml": 100000,
    },
  },
  {
    id: "putri-salju-coklat",
    name: "Putri Salju Coklat",
    image: "/cookies/putri-salju-coklat.jpg",
    basePrice: 65000,
    sizePrices: {
      "400ml": 65000,
      "600ml": 85000,
      "800ml": 115000,
    },
  },
  {
    id: "chocolate-pistacio",
    name: "Chocolate Pistacio",
    image: "/cookies/coklat-pistacio.jpeg",
    basePrice: 70000,
    sizePrices: {
      "400ml": 70000,
      "600ml": 95000,
      "800ml": 125000,
    },
  },
  {
    id: "kue-kacang",
    name: "Kue Kacang",
    image: "/cookies/kue-kacang.jpeg",
    basePrice: 40000,
    sizePrices: {
      "400ml": 40000,
      "600ml": 50000,
      "800ml": 70000,
    },
  },
  {
    id: "Matcha Almond",
    name: "Matcha Almond",
    image: "/cookies/almond.jpg",
    basePrice: 65000,
    sizePrices: {
      "400ml": 65000,
      "600ml": 85000,
      "800ml": 115000,
    },
  },
  {
    id: "kue-abon-bawang",
    name: "Kue Abon Bawan",
    image: "/cookies/kue_abon_bawang.jpeg",
    basePrice: 50000,
    sizePrices: {
      "400ml": 50000,
      "600ml": 65000,
      "800ml": 85000,
    },
  }, {
    id: "choco-cheese-thumbprint",
    name: "Choco Cheese Thumbprint",
    image: "/cookies/choco_cheese.jpeg",
    basePrice: 65000,
    sizePrices: {
      "400ml": 65000,
      "600ml": 85000,
      "800ml": 110000,
    },
  },

  {
    id: "hampers1",
    name: "Hampers 1",
    image: "/cookies/hampers1.jpeg",
    basePrice: 6000,
    sizePrices: {
      "Satuan": 6000
    },
  },
  {
    id: "hampers2",
    name: "Hampers 2",
    image: "/cookies/hampers2.jpeg",
    basePrice: 9000,
    sizePrices: {
      "Satuan": 9000
    },
  },
  {
    id: "hampers3",
    name: "Hampers 3",
    image: "/cookies/hampers3.jpeg",
    basePrice: 19000,
    sizePrices: {
      "Satuan": 19000
    },
  },
  {
    id: "hampers4",
    name: "Hampers 4",
    image: "/cookies/hampers4.jpeg",
    basePrice: 16000,
    sizePrices: {
      "Satuan": 16000
    },
  },
  {
    id: "hampers5",
    name: "Hampers 5",
    image: "/cookies/hampers5.jpeg",
    basePrice: 3500,
    sizePrices: {
      "Satuan": 3500
    },
  },
];
