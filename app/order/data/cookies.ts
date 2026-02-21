import type { CookieProduct, SizeOption } from "../types";

// Google Sheet ID for order storage. Get from the sheet URL: .../d/SHEET_ID/edit
// Option 1: Set NEXT_PUBLIC_GOOGLE_SHEET_ID in .env.local
// Option 2: Replace the empty string below with your Sheet ID
export const GOOGLE_SHEET_ID =
  (typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_GOOGLE_SHEET_ID) ||
  "";

/**
 * Get base URL for the application
 */
function getBaseUrl(): string {
  // Client-side: use window.location
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side: use environment variable or fallback
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback (should be configured in production)
  return "https://your-domain.com";
}

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
  customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
}): string {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  let msg = `*Pesanan Kue - ${order.orderId}*\n\n`;
  msg += `*Informasi Pesanan*\n`;
  msg += `ID Pesanan: ${order.orderId}\n`;
  msg += `Tanggal Pesanan: ${order.orderDate}\n`;
  msg += `Tipe Pesanan: ${typeLabel}\n\n`;
  msg += `*Pelanggan*\n`;
  msg += `Nama: ${order.customer.name}\n`;
  msg += `WhatsApp: ${order.customer.whatsapp}\n`;
  msg += `Alamat: ${order.customer.address}\n`;
  if (order.customer.sales?.trim()) {
    msg += `Sales: ${order.customer.sales}\n`;
  }
  if (order.customer.note?.trim()) {
    msg += `Catatan: ${order.customer.note}\n`;
  }
  msg += `\n*Item*\n`;
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
  customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
  gifts?: string[];
  spinsUsed?: number;
  spinsRemaining?: number;
}): string {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  const normalizedWhatsApp = normalizeWhatsAppNumber(order.customer.whatsapp);
  
  let msg = `Pesanan Kue Baru - ${order.orderId}\n\n`;
  
  msg += `Informasi Pesanan\n`;
  msg += `ID Pesanan: ${order.orderId}\n`;
  msg += `Tanggal Pesanan: ${order.orderDate}\n`;
  msg += `Tipe Pesanan: ${typeLabel}\n\n`;
  
  msg += `Informasi Pelanggan\n`;
  msg += `Nama: ${order.customer.name}\n`;
  msg += `WhatsApp: ${normalizedWhatsApp}\n`;
  msg += `Alamat: ${order.customer.address}\n`;
  if (order.customer.sales?.trim()) {
    msg += `Sales: ${order.customer.sales}\n`;
  }
  if (typeof order.spinsUsed === "number" && typeof order.spinsRemaining === "number") {
    msg += `Spin Terpakai: ${order.spinsUsed}\n`;
    msg += `Sisa Spin: ${order.spinsRemaining}\n`;
  }
  if (order.customer.note?.trim()) {
    msg += `Catatan: ${order.customer.note}\n`;
  }
  msg += `\n`;
  
  msg += `Detail Kue\n`;
  order.items.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} ${item.size} `;
    msg += `   Jumlah: ${item.quantity}\n`;
    if (index < order.items.length - 1) msg += `\n`;
  });
  msg += `\n`;
  
  if (order.gifts && order.gifts.length > 0) {
    msg += `\nHadiah yang Dimenangkan\n`;
    order.gifts.forEach((gift, index) => {
      msg += `${index + 1}. ${gift}\n`;
    });
  }
  
  return msg;
}

export function buildTelegramOrderUpdateMessage(
  orderId: string,
  oldOrder: {
    customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
    orderType: string;
    items: { name: string; size: string; quantity: number; subtotal: number }[];
    total: number;
  },
  newOrder: {
    customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
    orderType: string;
    items: { name: string; size: string; quantity: number; subtotal: number }[];
    total: number;
  }
): string {
  const normalizedOldWhatsApp = normalizeWhatsAppNumber(oldOrder.customer.whatsapp);
  const normalizedNewWhatsApp = normalizeWhatsAppNumber(newOrder.customer.whatsapp);
  
  let msg = `<b>Pesanan Diperbarui - ${orderId}</b>\n\n`;
  
  const changes: string[] = [];
  
  // Compare customer information
  if (oldOrder.customer.name !== newOrder.customer.name) {
    changes.push(`Nama: "${oldOrder.customer.name}" → "${newOrder.customer.name}"`);
  }
  if (normalizedOldWhatsApp !== normalizedNewWhatsApp) {
    changes.push(`WhatsApp: <code>${normalizedOldWhatsApp}</code> → <code>${normalizedNewWhatsApp}</code>`);
  }
  if (oldOrder.customer.address !== newOrder.customer.address) {
    changes.push(`Alamat: "${oldOrder.customer.address}" → "${newOrder.customer.address}"`);
  }
  if (oldOrder.customer.note !== newOrder.customer.note) {
    const oldNote = oldOrder.customer.note || "(kosong)";
    const newNote = newOrder.customer.note || "(kosong)";
    changes.push(`Catatan: "${oldNote}" → "${newNote}"`);
  }
  if (oldOrder.customer.sales !== newOrder.customer.sales) {
    const oldSales = oldOrder.customer.sales || "(kosong)";
    const newSales = newOrder.customer.sales || "(kosong)";
    changes.push(`Sales: "${oldSales}" → "${newSales}"`);
  }
  
  // Compare order type
  if (oldOrder.orderType !== newOrder.orderType) {
    const oldType = oldOrder.orderType === "single" ? "Single (Satuan)" : "Hampers";
    const newType = newOrder.orderType === "single" ? "Single (Satuan)" : "Hampers";
    changes.push(`Tipe Pesanan: "${oldType}" → "${newType}"`);
  }
  
  // Compare items in detail - identify new, deleted, and updated items
  const oldItemsMap = new Map<string, { name: string; size: string; quantity: number }>();
  const newItemsMap = new Map<string, { name: string; size: string; quantity: number }>();
  
  oldOrder.items.forEach(item => {
    const key = `${item.name}|${item.size}`;
    oldItemsMap.set(key, item);
  });
  
  newOrder.items.forEach(item => {
    const key = `${item.name}|${item.size}`;
    newItemsMap.set(key, item);
  });
  
  // Find new items (in new but not in old)
  const newItems: string[] = [];
  newItemsMap.forEach((item, key) => {
    if (!oldItemsMap.has(key)) {
      newItems.push(`Ditambahkan: ${item.name} ${item.size} x${item.quantity}`);
    }
  });
  
  // Find deleted items (in old but not in new)
  const deletedItems: string[] = [];
  oldItemsMap.forEach((item, key) => {
    if (!newItemsMap.has(key)) {
      deletedItems.push(`Dihapus: ${item.name} ${item.size} x${item.quantity}`);
    }
  });
  
  // Find updated items (same name and size but different quantity)
  const updatedItems: string[] = [];
  newItemsMap.forEach((newItem, key) => {
    const oldItem = oldItemsMap.get(key);
    if (oldItem && oldItem.quantity !== newItem.quantity) {
      updatedItems.push(`Diperbarui: ${newItem.name} ${newItem.size} x${oldItem.quantity} → x${newItem.quantity}`);
    }
  });
  
  // Add item changes to changes array
  if (newItems.length > 0) {
    changes.push(...newItems);
  }
  if (deletedItems.length > 0) {
    changes.push(...deletedItems);
  }
  if (updatedItems.length > 0) {
    changes.push(...updatedItems);
  }
  
  // Compare total
  
  if (changes.length === 0) {
    msg += `Tidak ada perubahan yang terdeteksi.\n\n`;
  } else {
    msg += `<b>Perubahan:</b>\n`;
    changes.forEach((change, index) => {
      msg += `${index + 1}. ${change}\n`;
    });
    msg += `\n`;
  }
  
  // Show current order details
  msg += `<b>Detail Pesanan Saat Ini</b>\n`;
  const typeLabel = newOrder.orderType === "single" ? "Single (Satuan)" : "Hampers";
  msg += `Tipe Pesanan: ${typeLabel}\n`;
  msg += `Pelanggan: ${newOrder.customer.name}\n`;
  msg += `WhatsApp: <code>${normalizedNewWhatsApp}</code>\n`;
  msg += `Alamat: ${newOrder.customer.address}\n`;
  if (newOrder.customer.sales?.trim()) {
    msg += `Sales: ${newOrder.customer.sales}\n`;
  }
  msg += `\n`;
  msg += `<b>Item:</b>\n`;
  newOrder.items.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} ${item.size} x ${item.quantity} = Rp ${item.subtotal.toLocaleString("id-ID")}\n`;
  });
  msg += `\n`;
  
  // Add WhatsApp link
  const whatsappMessageText = buildWhatsAppOrderUpdateMessage(orderId, oldOrder, newOrder);
  const encodedMessage = encodeURIComponent(whatsappMessageText);
  const whatsappUrl = `https://wa.me/${normalizedNewWhatsApp}?text=${encodedMessage}`;
  
  msg += `\n\n<a href="${whatsappUrl}">Kirim ke WhatsApp</a>`;
  
  return msg;
}

/**
 * Build plain text message for WhatsApp order update (same content as Telegram but without HTML)
 */
function buildWhatsAppOrderUpdateMessage(
  orderId: string,
  oldOrder: {
    customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
    orderType: string;
    items: { name: string; size: string; quantity: number; subtotal: number }[];
    total: number;
  },
  newOrder: {
    customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
    orderType: string;
    items: { name: string; size: string; quantity: number; subtotal: number }[];
    total: number;
  }
): string {
  const normalizedOldWhatsApp = normalizeWhatsAppNumber(oldOrder.customer.whatsapp);
  const normalizedNewWhatsApp = normalizeWhatsAppNumber(newOrder.customer.whatsapp);
  
  let msg = `Pesanan Diperbarui - ${orderId}\n\n`;
  
  const changes: string[] = [];
  
  // Compare customer information
  if (oldOrder.customer.name !== newOrder.customer.name) {
    changes.push(`Nama: "${oldOrder.customer.name}" → "${newOrder.customer.name}"`);
  }
  if (normalizedOldWhatsApp !== normalizedNewWhatsApp) {
    changes.push(`WhatsApp: ${normalizedOldWhatsApp} → ${normalizedNewWhatsApp}`);
  }
  if (oldOrder.customer.address !== newOrder.customer.address) {
    changes.push(`Alamat: "${oldOrder.customer.address}" → "${newOrder.customer.address}"`);
  }
  if (oldOrder.customer.note !== newOrder.customer.note) {
    const oldNote = oldOrder.customer.note || "(kosong)";
    const newNote = newOrder.customer.note || "(kosong)";
    changes.push(`Catatan: "${oldNote}" → "${newNote}"`);
  }
  if (oldOrder.customer.sales !== newOrder.customer.sales) {
    const oldSales = oldOrder.customer.sales || "(kosong)";
    const newSales = newOrder.customer.sales || "(kosong)";
    changes.push(`Sales: "${oldSales}" → "${newSales}"`);
  }
  
  // Compare order type
  if (oldOrder.orderType !== newOrder.orderType) {
    const oldType = oldOrder.orderType === "single" ? "Single (Satuan)" : "Hampers";
    const newType = newOrder.orderType === "single" ? "Single (Satuan)" : "Hampers";
    changes.push(`Tipe Pesanan: "${oldType}" → "${newType}"`);
  }
  
  // Compare items in detail - identify new, deleted, and updated items
  const oldItemsMap = new Map<string, { name: string; size: string; quantity: number }>();
  const newItemsMap = new Map<string, { name: string; size: string; quantity: number }>();
  
  oldOrder.items.forEach(item => {
    const key = `${item.name}|${item.size}`;
    oldItemsMap.set(key, item);
  });
  
  newOrder.items.forEach(item => {
    const key = `${item.name}|${item.size}`;
    newItemsMap.set(key, item);
  });
  
  // Find new items (in new but not in old)
  const newItems: string[] = [];
  newItemsMap.forEach((item, key) => {
    if (!oldItemsMap.has(key)) {
      newItems.push(`Ditambahkan: ${item.name} ${item.size} x${item.quantity}`);
    }
  });
  
  // Find deleted items (in old but not in new)
  const deletedItems: string[] = [];
  oldItemsMap.forEach((item, key) => {
    if (!newItemsMap.has(key)) {
      deletedItems.push(`Dihapus: ${item.name} ${item.size} x${item.quantity}`);
    }
  });
  
  // Find updated items (same name and size but different quantity)
  const updatedItems: string[] = [];
  newItemsMap.forEach((newItem, key) => {
    const oldItem = oldItemsMap.get(key);
    if (oldItem && oldItem.quantity !== newItem.quantity) {
      updatedItems.push(`Diperbarui: ${newItem.name} ${newItem.size} x${oldItem.quantity} → x${newItem.quantity}`);
    }
  });
  
  // Add item changes to changes array
  if (newItems.length > 0) {
    changes.push(...newItems);
  }
  if (deletedItems.length > 0) {
    changes.push(...deletedItems);
  }
  if (updatedItems.length > 0) {
    changes.push(...updatedItems);
  }
  
  if (changes.length === 0) {
    msg += `Tidak ada perubahan yang terdeteksi.\n\n`;
  } else {
    msg += `Perubahan:\n`;
    changes.forEach((change, index) => {
      msg += `${index + 1}. ${change}\n`;
    });
    msg += `\n`;
  }
  
  // Show current order details
  msg += `Detail Pesanan Saat Ini\n`;
  const typeLabel = newOrder.orderType === "single" ? "Single (Satuan)" : "Hampers";
  msg += `Tipe Pesanan: ${typeLabel}\n`;
  msg += `Pelanggan: ${newOrder.customer.name}\n`;
  msg += `WhatsApp: ${normalizedNewWhatsApp}\n`;
  msg += `Alamat: ${newOrder.customer.address}\n`;
  if (newOrder.customer.sales?.trim()) {
    msg += `Sales: ${newOrder.customer.sales}\n`;
  }
  msg += `\n`;
  msg += `Item:\n`;
  newOrder.items.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} ${item.size} x ${item.quantity} = Rp ${item.subtotal.toLocaleString("id-ID")}\n`;
  });
  msg += `\n`;
  
  // Add edit order link
  const baseUrl = getBaseUrl();
  const salesParam = newOrder.customer.sales ? `?sales=${encodeURIComponent(newOrder.customer.sales)}` : "";
  const editLink = `${baseUrl}/order/edit/${orderId}${salesParam}`;
  
  return msg;
}

export function buildTelegramOrderMessage(order: {
  orderId: string;
  orderDate: string;
  customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
  gifts?: string[];
  spinsUsed?: number;
  spinsRemaining?: number;
}): string {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  const normalizedWhatsApp = normalizeWhatsAppNumber(order.customer.whatsapp);
  
  let msg = `<b>Pesanan Kue Baru - ${order.orderId}</b>\n\n`;
  
  msg += `<b>Informasi Pesanan</b>\n`;
  msg += `ID Pesanan: <code>${order.orderId}</code>\n`;
  msg += `Tanggal Pesanan: ${order.orderDate}\n`;
  msg += `Tipe Pesanan: ${typeLabel}\n\n`;
  
  msg += `<b>Informasi Pelanggan</b>\n`;
  msg += `Nama: ${order.customer.name}\n`;
  msg += `WhatsApp: <code>${normalizedWhatsApp}</code>\n`;
  msg += `Alamat: ${order.customer.address}\n`;
  if (order.customer.sales?.trim()) {
    msg += `Sales: ${order.customer.sales}\n`;
  }
  if (typeof order.spinsUsed === "number" && typeof order.spinsRemaining === "number") {
    msg += `Spin Terpakai: ${order.spinsUsed}\n`;
    msg += `Sisa Spin: ${order.spinsRemaining}\n`;
  }
  if (order.customer.note?.trim()) {
    msg += `Catatan: ${order.customer.note}\n`;
  }
  msg += `\n`;
  
  msg += `<b>Detail Kue</b>\n`;
  order.items.forEach((item, index) => {
    msg += `${index + 1}. ${item.name} ${item.size} `;
    msg += `   Jml: ${item.quantity}\n`;
    if (index < order.items.length - 1) msg += `\n`;
  });
  msg += `\n`;
  
  
  if (order.gifts && order.gifts.length > 0) {
    msg += `\n<b>Hadiah yang Dimenangkan</b>\n`;
    order.gifts.forEach((gift, index) => {
      msg += `${index + 1}. ${gift.replace(/<br\s*\/>/g, "\n")}\n`;
    });
  }
  
  // Add WhatsApp link
  const whatsappMessageText = buildWhatsAppMessageText(order);
  const encodedMessage = encodeURIComponent(whatsappMessageText);
  const whatsappUrl = `https://wa.me/${normalizedWhatsApp}?text=${encodedMessage}`;
  
  msg += `\n\n<a href="${whatsappUrl}">Kirim ke WhatsApp</a>`;
  
  return msg;
}

export function buildSheetRow(order: {
  orderId: string;
  orderDate: string;
  customer: { name: string; whatsapp: string; address: string; note: string; sales?: string };
  orderType: string;
  items: { name: string; size: string; quantity: number; subtotal: number }[];
  total: number;
}, spinFields?: any): Record<string, string | number> {
  const typeLabel = order.orderType === "single" ? "Single (Satuan)" : "Hampers";
  const itemsStr = order.items
    .map(
      (i) =>
        `${i.name} ${i.size} x ${i.quantity} = Rp ${i.subtotal.toLocaleString("id-ID")}`
    )
    .join(" | ");
  const normalizedWhatsApp = normalizeWhatsAppNumber(order.customer.whatsapp);
  const eligibleForGift = spinFields?.eligibleForGift ?? (getSpinChances(order.total) >= 1 ? "Ya" : "Tidak");
  const spinsUsed = spinFields?.spinsUsed ?? 0;
  const spinCompleted = spinFields?.spinCompleted ?? "Tidak";
  return {
    "Order ID": order.orderId,
    "Order Date": order.orderDate,
    "Customer Name": order.customer.name,
    WhatsApp: normalizedWhatsApp,
    Address: order.customer.address,
    Note: order.customer.note || "",
    Sales: order.customer.sales || "",
    "Order Type": typeLabel,
    Items: itemsStr,
    Total: order.total,
    "Eligible for Gift": eligibleForGift,
    "Spins Used": spinsUsed,
    "Spin Completed": spinCompleted,
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
export const SPIN_THRESHOLD = 500_000;

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
    orderType:"hampers",
    image: "/cookies/hampers1.jpeg",
    basePrice: 6000,
    sizePrices: {
      "Satuan": 6000
    },
  },
  {
    id: "hampers2",
    name: "Hampers 2",
    orderType:"hampers",
    image: "/cookies/hampers2.jpeg",
    basePrice: 9000,
    sizePrices: {
      "Satuan": 9000
    },
  },
  {
    id: "hampers3",
    name: "Hampers 3",
    orderType:"hampers",
    image: "/cookies/hampers3.jpeg",
    basePrice: 19000,
    sizePrices: {
      "Satuan": 19000
    },
  },
  {
    id: "hampers4",
    name: "Hampers 4",
    orderType:"hampers",
    image: "/cookies/hampers4.jpeg",
    basePrice: 16000,
    sizePrices: {
      "Satuan": 16000
    },
  },
  {
    id: "hampers5",
    name: "Hampers 5",
    orderType:"hampers",
    image: "/cookies/hampers5.jpeg",
    basePrice: 3500,
    sizePrices: {
      "Satuan": 3500
    },
  },
];
