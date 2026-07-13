"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrCreateUserId } from "../lib/sessionStorage";
import type { DashboardStats } from "../lib/types";

function ScoreChart({ items }: { items: DashboardStats["progressScores"] }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i.score), 1);

  return (
    <div className="mt-4 space-y-2">
      {items.map((item, i) => (
        <div key={`${item.date}-${i}`} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate text-black/50" title={item.quizTitle}>
            {new Date(item.date).toLocaleDateString("id-ID")}
          </span>
          <div className="progress-bar flex-1">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.round((item.score / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-semibold">{item.score}</span>
        </div>
      ))}
    </div>
  );
}

export default function QuizDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const userId = getOrCreateUserId();
    try {
      const res = await fetch(
        `/api/quiz/dashboard?userId=${encodeURIComponent(userId)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat dashboard");
      setStats(json.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-black/60">Memuat dashboard…</p>;
  if (error) return <p className="text-red-700">{error}</p>;
  if (!stats) return null;

  const cards = [
    { label: "Total Quiz", value: stats.totalAttempts },
    { label: "Average Score", value: stats.averageScore },
    { label: "Highest Score", value: stats.highestScore },
    { label: "Lowest Score", value: stats.lowestScore },
    { label: "Total Correct", value: stats.totalCorrect },
    { label: "Total Wrong", value: stats.totalWrong },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark-blue)]">
        Dashboard Report
      </h2>
      <p className="mt-1 text-sm text-black/60">Statistik percobaan quiz Anda.</p>

      {stats.totalAttempts === 0 ? (
        <p className="mt-6 rounded-lg bg-black/5 p-6 text-center text-black/60">
          Kerjakan quiz terlebih dahulu untuk melihat statistik.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="stat-card">
                <p className="text-sm text-black/55">{c.label}</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-dark-blue)]">
                  {c.value}
                </p>
              </div>
            ))}
          </div>

          <section className="card-quiz mt-8 p-5">
            <h3 className="font-semibold text-[var(--color-dark-blue)]">
              Progress Nilai
            </h3>
            <ScoreChart items={stats.progressScores} />
          </section>

          <section className="card-quiz mt-6 p-5">
            <h3 className="font-semibold text-[var(--color-dark-blue)]">Nilai per Quiz</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {stats.scoreByQuiz.map((s, i) => (
                <li
                  key={`${s.quizId}-${s.date}-${i}`}
                  className="flex justify-between border-b border-black/5 py-2"
                >
                  <span>
                    {s.title}{" "}
                    <span className="text-black/45">
                      ({new Date(s.date).toLocaleDateString("id-ID")})
                    </span>
                  </span>
                  <span className="font-bold">{s.score}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
