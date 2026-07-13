"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { beginQuizAttempt, loadQuizState } from "../../lib/sessionStorage";
import type { SubmitResult } from "../../lib/types";

export default function QuizResultPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [result, setResult] = useState<SubmitResult | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadQuizState(quizId);
    if (stored?.results) {
      setResult(stored.results);
    }
    (async () => {
      try {
        const res = await fetch(`/api/quiz/quiz/${encodeURIComponent(quizId)}`);
        const json = await res.json();
        if (res.ok) {
          setQuizTitle(json.quiz?.title ?? "");
          setDuration(json.quiz?.duration ?? 30);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  if (loading) {
    return <p className="text-black/60">Memuat hasil…</p>;
  }

  if (!result) {
    return (
      <div>
        <p className="text-black/70">Belum ada hasil quiz.</p>
        <Link href={`/quiz/${quizId}`} className="mt-4 inline-block text-[var(--color-accent)]">
          Mulai quiz
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold text-[var(--color-dark-blue)]">Hasil Quiz</h2>
      {quizTitle && <p className="mt-1 text-black/65">{quizTitle}</p>}

      <div className="card-quiz mt-6 grid gap-4 p-6 sm:grid-cols-2">
        <div className="stat-card text-center sm:col-span-2">
          <p className="text-sm text-black/55">Score</p>
          <p className="text-4xl font-bold text-[var(--color-dark-blue)]">
            {result.score}
          </p>
        </div>
        <div className="stat-card text-center">
          <p className="text-sm text-black/55">Correct</p>
          <p className="text-2xl font-bold text-emerald-700">{result.correct}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-sm text-black/55">Wrong</p>
          <p className="text-2xl font-bold text-red-700">{result.wrong}</p>
        </div>
        <div className="stat-card text-center sm:col-span-2">
          <p className="text-sm text-black/55">Passing</p>
          <p
            className={`text-2xl font-bold ${
              result.passed ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {result.passed ? "YES" : "NO"}
          </p>
          <p className="mt-1 text-xs text-black/45">
            Minimum: {result.passingScore} · Status:{" "}
            {result.status === "timeout" ? "Waktu habis" : "Selesai"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            beginQuizAttempt(quizId, duration);
            router.push(`/quiz/${quizId}/take`);
          }}
          className="rounded-lg bg-[var(--color-dark-blue)] px-5 py-2.5 font-semibold text-white"
        >
          Ulangi Quiz
        </button>
        <Link
          href={`/quiz/${quizId}/review`}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 font-semibold text-white"
        >
          Review Jawaban
        </Link>
        <Link
          href="/quiz/history"
          className="rounded-lg border-2 border-black/15 px-5 py-2.5 font-medium"
        >
          Riwayat
        </Link>
        <Link href="/quiz" className="rounded-lg border-2 border-black/15 px-5 py-2.5 font-medium">
          Daftar Quiz
        </Link>
      </div>
    </div>
  );
}
