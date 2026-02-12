"use client";

interface OrderSummaryProps {
  total: number;
  itemCount: number;
}

export default function OrderSummary({ total, itemCount }: OrderSummaryProps) {
  const formattedTotal = total.toLocaleString("id-ID");
  return (
    <div className="w-full rounded-xl bg-dark-blue p-4 text-white shadow-md sm:p-5 sm:min-w-[280px]">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">Order Summary</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/90">Items</span>
          <span className="font-medium tabular-nums">{itemCount}</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/20 pt-3">
          <span className="text-base font-semibold sm:text-lg">Grand Total</span>
          <span className="text-lg font-bold text-accent-yellow tabular-nums sm:text-xl">
            Rp {formattedTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
