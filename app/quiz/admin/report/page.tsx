"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DashboardStats } from "../../lib/types";

export default function QuizAdminReportPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/dashboard?admin=1");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unauthorized atau gagal memuat");
      setStats(json.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-black/60">Memuat report…</p>;
  if (error) {
    return (
      <div>
        <p className="text-red-700">{error}</p>
        <Link href="/quiz/admin" className="mt-4 inline-block text-[var(--color-accent)]">
          Kembali ke Admin
        </Link>
      </div>
    );
  }
  if (!stats) return null;

  const cards = [
    { label: "Total Attempts", value: stats.totalAttempts },
    { label: "Average Score", value: stats.averageScore },
    { label: "Highest Score", value: stats.highestScore },
    { label: "Lowest Score", value: stats.lowestScore },
    { label: "Total Correct", value: stats.totalCorrect },
    { label: "Total Wrong", value: stats.totalWrong },
  ];

  return (
    <div>
      <Link href="/quiz/admin" className="text-sm text-[var(--color-accent)] hover:underline">
        ← Admin
      </Link>
      <h2 className="mt-2 text-xl font-bold text-[var(--color-dark-blue)]">
        Report Seluruh Peserta
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <p className="text-sm text-black/55">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="card-quiz mt-8 p-5">
        <h3 className="font-semibold">Semua Percobaan</h3>
        <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
          {stats.scoreByQuiz.map((s, i) => (
            <li
              key={`${s.quizId}-${s.date}-${i}`}
              className="flex justify-between border-b border-black/5 py-2"
            >
              <span>
                {s.title}{" "}
                <span className="text-black/45">
                  {new Date(s.date).toLocaleString("id-ID")}
                </span>
              </span>
              <span className="font-bold">{s.score}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
