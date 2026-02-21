"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SpinWheel from "../../components/SpinWheel";
import {
  GOOGLE_SHEET_ID,
  getSpinChances,
  SPIN_PRIZES,
  buildSpinResultRow,
  buildTelegramOrderMessage,
} from "../../data/cookies";

type OrderRow = {
  "Order ID": string;
  "Order Date"?: string;
  "Customer Name": string;
  WhatsApp?: string;
  Address?: string;
  Note?: string;
  Sales?: string;
  "Order Type"?: string;
  Total: number;
  "Eligible for Gift"?: string;
  "Spins Used"?: number;
  "Spin Completed"?: string;
};

type CookieDetailRow = {
  "Order ID": string;
  "Cookie Name": string;
  Size?: string;
  Quantity?: number;
  Subtotal?: number;
};

export default function OrderSpinPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [cookieDetails, setCookieDetails] = useState<CookieDetailRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spinsRemaining, setSpinsRemaining] = useState(0);
  const [spinsUsed, setSpinsUsed] = useState(0);
  const [giftsWon, setGiftsWon] = useState<string[]>([]);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          const data = await res.json();
          setLoadError(data.error || "Gagal memuat pesanan");
          return;
        }
        const { order: orderData, cookieDetails: cookieDetailsData } = await res.json();
        setOrder(orderData);
        setCookieDetails(cookieDetailsData || []);

        const eligible = orderData["Eligible for Gift"] ?? (getSpinChances(parseFloat(orderData["Total"]) || 0) >= 1 ? "Ya" : "Tidak");
        const completed = orderData["Spin Completed"] ?? "Tidak";
        const used = Number(orderData["Spins Used"]) || 0;
        if (eligible !== "Ya") {
          setLoadError(completed === "Ya" ? "Anda sudah menggunakan spin untuk pesanan ini." : "Pesanan ini tidak memenuhi syarat untuk spin hadiah.");
          return;
        } else if (completed === "Ya") {
          setLoadError("Anda sudah menggunakan spin untuk pesanan ini.");
          return;
        }

        const total = parseFloat(orderData["Total"]) || 0;
        const totalSpins = getSpinChances(total);
        const remaining = Math.max(0, totalSpins - used);
        setSpinsRemaining(remaining);
        setSpinsUsed(used);

        if (remaining <= 0) {
          setLoadError("Tidak ada spin tersisa untuk pesanan ini.");
        }
      } catch (err) {
        console.error("Error loading order:", err);
        setLoadError("Gagal memuat pesanan");
      } finally {
        setIsLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-dark-blue mb-4">Spin Hadiah</h1>
          <p className="text-gray-600 mb-6">{loadError || "Pesanan tidak ditemukan."}</p>
          <div className="space-y-3">
            <Link
              href={orderId ? `/order/thanks?orderId=${orderId}` : "/order"}
              className="block min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90"
            >
              Kembali
            </Link>
            <Link
              href="/order"
              className="block min-h-[48px] rounded-xl border border-gray-300 px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50"
            >
              Buat Pesanan Baru
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-dark-blue">Spin Hadiah</h1>
        <p className="text-sm text-gray-600 mt-1">Pesanan: {orderId}</p>
        <p className="text-sm text-gray-600">Sisa spin: {spinsRemaining}</p>
      </div>
      <SpinWheel
        prizes={SPIN_PRIZES}
        spinsRemaining={spinsRemaining}
        onSpinComplete={async (prize) => {
          if (prize.label !== "Try Again") {
            setSpinsRemaining((prev) => prev - 1);
            setGiftsWon((prev) => [...prev, prize.label]);
            if (GOOGLE_SHEET_ID) {
              try {
                const row = buildSpinResultRow({
                  orderId,
                  customerName: order["Customer Name"],
                  gift: prize.label,
                });
                await fetch("/api/sheets/write", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    spreadsheetId: GOOGLE_SHEET_ID,
                    data: [row],
                    sheetName: "Spin Rewards",
                  }),
                });
              } catch (err) {
                console.error("Failed to save spin reward:", err);
              }
            }
          }
        }}
        onClose={async () => {
          if (order == null) return;
          const total = typeof order.Total === "number" ? order.Total : parseFloat(String(order.Total)) || 0;
          const totalChances = getSpinChances(total);
          const usedAfterClose = totalChances - spinsRemaining;
          const spinCompleted = spinsRemaining === 0 ? "Ya" : "Skipped";

          if (GOOGLE_SHEET_ID) {
            try {
              await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spinsUsed: usedAfterClose, spinCompleted }),
              });
            } catch (err) {
              console.error("Failed to update spin status:", err);
            }
          }

          if (spinsRemaining === 0) {
            try {
              const items = cookieDetails.map((c) => ({
                name: c["Cookie Name"],
                size: c.Size || "",
                quantity: Number(c.Quantity) || 0,
                subtotal: Number(c.Subtotal) || 0,
              }));
              const orderType = (order["Order Type"] || "").toLowerCase().includes("single") ? "single" : "hampers";
              const telegramMessage = buildTelegramOrderMessage({
                orderId: order["Order ID"],
                orderDate: order["Order Date"] || "",
                customer: {
                  name: order["Customer Name"],
                  whatsapp: order.WhatsApp || "",
                  address: order.Address || "",
                  note: order.Note || "",
                  sales: order.Sales,
                },
                orderType,
                items,
                total,
                gifts: giftsWon.length > 0 ? giftsWon : undefined,
                spinsUsed: usedAfterClose,
                spinsRemaining: 0,
              });
              await fetch("/api/telegram/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: telegramMessage }),
              });
            } catch (telegramErr) {
              console.error("Failed to send Telegram notification:", telegramErr);
            }
          }

          router.push(`/order/thanks?orderId=${orderId}&spinCompleted=${spinCompleted}`);
        }}
      />
    </div>
  );
}
