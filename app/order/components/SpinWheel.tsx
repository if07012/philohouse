"use client";

import { useState, useCallback, useMemo } from "react";
import type { SpinPrize } from "../data/cookies";

interface SpinWheelProps {
  prizes: SpinPrize[];
  spinsRemaining: number;
  onSpinComplete: (prize: SpinPrize) => void;
  onClose: () => void;
}

const COLORS = [
  "#ef476f", // primary-pink
  "#26547c", // dark-blue
  "#ffd166", // accent-yellow
  "#06d6a0",
  "#118ab2",
  "#9b5de5",
  "#f15bb5",
  "#00f5d4",
];

export default function SpinWheel({
  prizes,
  spinsRemaining,
  onSpinComplete,
  onClose,
}: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [rotation, setRotation] = useState(0);

  const segmentAngle = 360 / prizes.length;

  const conicGradient = useMemo(() => {
    const stops = prizes
      .map(
        (_, i) =>
          `${COLORS[i % COLORS.length]} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
      )
      .join(", ");
    return `conic-gradient(from 0deg, ${stops})`;
  }, [prizes, segmentAngle]);

  const handleSpin = useCallback(() => {
    if (isSpinning || spinsRemaining <= 0) return;
    setIsSpinning(true);
    setWonPrize(null);

    const winIndex = Math.floor(Math.random() * prizes.length);
    const prize = prizes[winIndex];
    const segmentCenter = winIndex * segmentAngle + segmentAngle / 2;
    const targetRotation = 360 * 5 + (360 - segmentCenter);
    const newRotation = rotation + targetRotation;

    setRotation(newRotation);

    const duration = 4000;
    const wheel = document.getElementById("spin-wheel-inner");
    if (wheel) {
      wheel.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
      wheel.style.transform = `rotate(${newRotation}deg)`;
    }

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(prize);
      onSpinComplete(prize);
    }, duration);
  }, [isSpinning, spinsRemaining, prizes, segmentAngle, rotation, onSpinComplete]);

  const handleNext = useCallback(() => {
    setWonPrize(null);
    if (spinsRemaining <= 0) {
      onClose();
    } else {
      handleSpin();
    }
  }, [spinsRemaining, onClose, handleSpin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full sm:w-96 rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-center">
          <h3 className="text-xl font-bold text-dark-blue">
            Spin to Win
          </h3>
          <p className="text-sm text-gray-600">
            {spinsRemaining} spin{spinsRemaining !== 1 ? "s" : ""} remaining
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-64 sm:w-96">
          <div
            className="absolute inset-0 z-10 flex items-start justify-center"
            style={{ transform: "translateY(-8px)" }}
          >
            <div
              className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary-pink drop-shadow-md"
              style={{ transform: "translateY(-4px)" }}
            />
          </div>
          <div className="absolute inset-4 overflow-hidden rounded-full border-4 border-dark-blue shadow-inner">
            <div
              id="spin-wheel-inner"
              className="relative h-full w-full rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: "none",
                background: conicGradient,
              }}
            >
              {prizes.map((prize, i) => {
                const angle = (i + 0.5) * segmentAngle - 90;
                const rad = (angle * Math.PI) / 180;
                const r = 38;
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <span
                    key={prize.id}
                    className="absolute text-[10px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] sm:text-xs"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      whiteSpace: "nowrap",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: prize.label
                    }}
                  >

                  </span>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-white bg-dark-blue" />
            </div>
          </div>
        </div>

        {wonPrize ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-accent-yellow/20 p-4 text-center">
              <p className="text-sm font-medium text-gray-600">
                Congratulations! You won:
              </p>
              <div className="mt-1 text-lg font-bold text-dark-blue" dangerouslySetInnerHTML={{ __html: wonPrize.label }}>

              </div>
            </div>
            {spinsRemaining > 0 ? (
              <button
                type="button"
                onClick={handleNext}
                className="w-full rounded-xl bg-primary-pink py-3 font-semibold text-white hover:bg-primary-pink/90"
              >
                Spin Again ({spinsRemaining} left)
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-primary-pink py-3 font-semibold text-white hover:bg-primary-pink/90"
              >
                Done
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full rounded-xl bg-primary-pink py-3 font-semibold text-white hover:bg-primary-pink/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSpinning ? "Spinning..." : "Spin"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-xl border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
