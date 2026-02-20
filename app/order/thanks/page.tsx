"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderThanksContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  // Get sales ID from localStorage to include in links
  const getSalesParam = () => {
    if (typeof window !== "undefined") {
      const salesId = localStorage.getItem("cookie_order_sales_id");
      return salesId ? `?sales=${encodeURIComponent(salesId)}` : "";
    }
    return "";
  };
  
  const salesParam = getSalesParam();
  const editLink = orderId ? `/order/edit/${orderId}${salesParam}` : "";
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
          Thank you for your order!
        </h1>
        <p className="mt-3 text-gray-600">
          Your order has been submitted successfully. We&apos;ll get back to you
          shortly via WhatsApp.
        </p>
        {orderId && (
          <p className="mt-2 text-xs text-gray-500">
            Order ID: {orderId}
          </p>
        )}
        <div className="mt-6 space-y-3">
          {orderId && (
            <Link
              href={editLink}
              className="block min-h-[48px] rounded-xl bg-dark-blue px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-dark-blue/90 hover:shadow-lg"
            >
              Edit Order
            </Link>
          )}
          <Link
            href={newOrderLink}
            className="block min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 hover:shadow-lg"
          >
            Place another order
          </Link>
        </div>
        <Link
          href="/"
          className="mt-3 block text-sm font-medium text-primary-pink hover:underline"
        >
          Back to home
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
