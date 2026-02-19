"use client";

export type OrderTypeOption = "single" | "hampers";

interface OrderTypeProps {
  value: OrderTypeOption;
  onChange: (value: OrderTypeOption) => void;
}

export default function OrderType({ value, onChange }: OrderTypeProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-md sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-dark-blue sm:text-lg">
        Jenis Pesanan
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
        <label
          className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
            value === "single"
              ? "border-primary-pink bg-primary-pink/5"
              : "border-gray-200"
          }`}
        >
          <input
            type="radio"
            name="orderType"
            value="single"
            checked={value === "single"}
            onChange={() => onChange("single")}
            className="h-5 w-5 shrink-0 border-gray-300 text-primary-pink focus:ring-primary-pink"
          />
          <span className="text-gray-700">Satuan</span>
        </label>
        <label
          className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
            value === "hampers"
              ? "border-primary-pink bg-primary-pink/5"
              : "border-gray-200"
          }`}
        >
          <input
            type="radio"
            name="orderType"
            value="hampers"
            checked={value === "hampers"}
            onChange={() => onChange("hampers")}
            className="h-5 w-5 shrink-0 border-gray-300 text-primary-pink focus:ring-primary-pink"
          />
          <span className="text-gray-700">Hampers / Paket</span>
        </label>
      </div>
    </div>
  );
}
