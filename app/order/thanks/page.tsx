"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSpinChances } from "../data/cookies";

function OrderThanksContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [spinCompleted, setSpinCompleted] = useState<"Ya" | "Tidak" | "Skipped">("Tidak");
  const [continueSpin, setContinueSpin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getSalesParam = () => {
    if (typeof window !== "undefined") {
      const salesId = localStorage.getItem("cookie_order_sales_id");
      return salesId ? `?sales=${encodeURIComponent(salesId)}` : "";
    }
    return "";
  };

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          const data = await res.json();
          return;
        }
        const { order: orderData } = await res.json();
        const used = Number(orderData["Spins Used"]) || 0;
        setSpinCompleted(orderData["Spin Completed"] ?? "Tidak");
        const total = parseFloat(orderData["Total"]) || 0;
        const totalSpins = getSpinChances(total);
        const remaining = Math.max(0, totalSpins - used);

        if (remaining > 0 && orderData["Spin Completed"] != "Ya") {
          setContinueSpin(true);
        }
      } catch (err) {
        console.error("Error loading order:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);


  const salesParam = getSalesParam();
  const editLink = orderId ? `/order/edit/${orderId}${salesParam}` : "";
  const spinLink = orderId ? `/order/spin/${orderId}` : "";
  const newOrderLink = `/order${salesParam}`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-dark-blue sm:text-3xl">
          Terima kasih atas pesanan Anda!
        </h1>
        <p className="mt-3 text-gray-600">
          Pesanan Anda telah berhasil dikirim. Kami akan segera menghubungi Anda
          melalui WhatsApp.
        </p>
        {orderId && (
          <p className="mt-2 text-xs text-gray-500">
            ID Pesanan: {orderId}
          </p>
        )}
        {!isLoading && (
          <div className="mt-6 space-y-3">
            {((spinCompleted != "Ya") || continueSpin) && (
              <Link
                href={spinLink}
                className="block min-h-[48px] rounded-xl bg-accent-yellow px-8 py-4 text-base font-semibold text-dark-blue shadow-md transition-all hover:bg-accent-yellow/90 hover:shadow-lg"
              >
                Spin Hadiah Sekarang
              </Link>
            )}
            {orderId && !(spinCompleted || continueSpin) && (
              <Link
                href={editLink}
                className="block min-h-[48px] rounded-xl bg-dark-blue px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-dark-blue/90 hover:shadow-lg"
              >
                Edit Pesanan
              </Link>
            )}
            <Link
              href={newOrderLink}
              className="block min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 hover:shadow-lg"
            >
              Buat Pesanan Baru
            </Link>
          </div>
        )}
        <Link
          href="/"
          className="mt-3 block text-sm font-medium text-primary-pink hover:underline"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}

export default function OrderThanksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OrderThanksContent />
    </Suspense>
  );
}
