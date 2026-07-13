"use client";

import { QuizNav } from "./components/QuizNav";
import "./components/quiz.css";

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="quiz-module min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-2">
          <h1 className="text-2xl font-bold text-[var(--color-dark-blue)]">
            Quiz Management
          </h1>
          <p className="text-sm text-black/60">
            Kerjakan quiz, lihat hasil, dan pantau perkembangan belajar.
          </p>
        </header>
        <QuizNav />
        {children}
      </div>
    </div>
  );
}
