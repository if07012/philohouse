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
  const [showFullscreen, setShowFullscreen] = useState(false);
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
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-24 sm:w-24 group cursor-pointer">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 96px"
            unoptimized
            onClick={() => setShowFullscreen(true)}
          />
          <button
            type="button"
            onClick={() => setShowFullscreen(true)}
            className="absolute top-2 right-2 min-h-[32px] min-w-[32px] rounded-full bg-black/50 backdrop-blur-sm p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70 active:scale-95"
            aria-label="View fullscreen"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </button>
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
                  sizePrices[size] && <option key={size} value={size}>
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

      {/* Fullscreen Image Modal */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-full bg-white/10 backdrop-blur-sm p-2 text-white transition-colors hover:bg-white/20 active:scale-95"
            aria-label="Close"
          >
            <svg
              className="h-6 w-6"
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
          <div
            className="relative h-full w-full max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-contain"
              sizes="90vw"
              unoptimized
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
