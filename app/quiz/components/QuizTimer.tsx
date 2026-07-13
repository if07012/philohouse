"use client";

import { useEffect, useState } from "react";
import { formatTimeRemaining } from "../lib/sessionStorage";

type QuizTimerProps = {
  expiresAt: number;
  onTimeout: () => void;
};

export function QuizTimer({ expiresAt, onTimeout }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, expiresAt - Date.now());
      setRemaining(ms);
      if (ms <= 0 && !timedOut) {
        setTimedOut(true);
        onTimeout();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onTimeout, timedOut]);

  const urgent = remaining <= 60_000;

  return (
    <div
      className={`rounded-lg px-4 py-2 font-mono text-lg font-bold tabular-nums ${
        urgent ? "bg-red-100 text-red-800" : "bg-black/5 text-[var(--color-dark-blue)]"
      }`}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining ${formatTimeRemaining(remaining)}`}
    >
      {formatTimeRemaining(remaining)}
    </div>
  );
}
