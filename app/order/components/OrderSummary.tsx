"use client";

import { getSpinChances, SPIN_THRESHOLD } from "../data/cookies";

interface OrderSummaryProps {
  total: number;
  itemCount: number;
  hideSpin?: boolean;
}

export default function OrderSummary({ total, itemCount, hideSpin = false }: OrderSummaryProps) {
  const formattedTotal = total.toLocaleString("id-ID");
  const spins = getSpinChances(total);
  return (
    <div className="w-full rounded-xl bg-dark-blue p-4 text-white shadow-md sm:p-5 sm:min-w-[280px]">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">Ringkasan Pesanan</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/90">Item</span>
          <span className="font-medium tabular-nums">{itemCount}</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/20 pt-3">
          <span className="text-base font-semibold sm:text-lg">Total</span>
          <span className="text-lg font-bold text-accent-yellow tabular-nums sm:text-xl">
            Rp {formattedTotal}
          </span>
        </div>
        {!hideSpin && (
          <p className="text-xs text-white/70">
            {spins >= 1
              ? `🎉 ${spins} spin${spins !== 1 ? "s" : ""} after order!`
              : `Add Rp ${(SPIN_THRESHOLD - (total % SPIN_THRESHOLD)).toLocaleString("id-ID")} more for 1 spin`}
          </p>
        )}
      </div>
    </div>
  );
}
