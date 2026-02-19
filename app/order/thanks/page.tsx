"use client";

import Link from "next/link";

export default function OrderThanksPage() {
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
        <Link
          href="/order"
          className="mt-6 inline-block min-h-[48px] rounded-xl bg-primary-pink px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-pink/90 hover:shadow-lg"
        >
          Place another order
        </Link>
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
