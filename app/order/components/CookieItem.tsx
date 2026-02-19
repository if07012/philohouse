"use client";

import Image from "next/image";
import type { OrderItem, SizeOption } from "../types";
import { SIZE_OPTIONS } from "../data/cookies";
import { useState } from "react";

interface CookieItemProps {
  item: OrderItem;
  onSizeChange: (itemId: string, size: SizeOption) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  sizePrices: Record<SizeOption, number>;
}

export default function CookieItem({
  item,
  onSizeChange,
  onQuantityChange,
  onRemove,
  sizePrices,
}: CookieItemProps) {
  const [isEmpty, setIsEmpty] = useState(false);
  const handleQuantityChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      onQuantityChange(item.id, num);
      setIsEmpty(false);
    } else {
      onQuantityChange(item.id, 0);
      setIsEmpty(true);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-24 sm:w-24">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 96px"
            unoptimized
          />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-dark-blue">{item.name}</h3>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 active:bg-red-100"
              aria-label="Remove item"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <label className="block text-xs font-medium text-gray-500">
                Size
              </label>
              <select
                value={item.size}
                onChange={(e) =>
                  onSizeChange(item.id, e.target.value as SizeOption)
                }
                className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm"
              >
                {SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} - Rp {sizePrices[size].toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Quantity
              </label>
              <input
                value={isEmpty ? '' : item.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="mt-1 min-h-[44px] min-w-[72px] rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-primary-pink focus:outline-none focus:ring-2 focus:ring-primary-pink/30 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-500">Subtotal</span>
            <span className="font-semibold text-primary-pink">
              Rp {item.subtotal.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
