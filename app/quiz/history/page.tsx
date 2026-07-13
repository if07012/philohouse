"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getOrCreateUserId } from "../lib/sessionStorage";
import type { HistoryItem } from "../lib/types";

export default function QuizHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minScore, setMinScore] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const userId = getOrCreateUserId();
    const params = new URLSearchParams({ userId });
    if (quizTitle.trim()) params.set("quizTitle", quizTitle.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minScore) params.set("minScore", minScore);

    try {
      const res = await fetch(`/api/quiz/history?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat riwayat");
      setHistory(json.history || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  }, [quizTitle, dateFrom, dateTo, minScore]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-dark-blue)]">Riwayat Quiz</h2>

      <div className="card-quiz mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-black/55">Nama Quiz</label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Filter judul…"
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-black/55">Dari tanggal</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-black/55">Sampai tanggal</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-black/55">Min. score</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Terapkan Filter
          </button>
        </div>
      </div>

      {loading && <p className="mt-6 text-black/60">Memuat…</p>}
      {error && (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{error}</p>
      )}

      {!loading && !error && history.length === 0 && (
        <p className="mt-6 rounded-lg bg-black/5 p-6 text-center text-black/60">
          Belum ada riwayat quiz.
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-black/55">
              <th className="py-3 pr-4 font-semibold">Quiz</th>
              <th className="py-3 pr-4 font-semibold">Date</th>
              <th className="py-3 pr-4 font-semibold">Score</th>
              <th className="py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.attemptId} className="border-b border-black/5">
                <td className="py-3 pr-4">
                  <Link
                    href={`/quiz/${h.quizId}/review`}
                    className="font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {h.quizTitle}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-black/70">
                  {new Date(h.date).toLocaleString("id-ID")}
                </td>
                <td className="py-3 pr-4 font-semibold">{h.score}</td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      h.passed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {h.passed ? "Lulus" : "Tidak lulus"}
                    {h.status === "timeout" ? " (timeout)" : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
