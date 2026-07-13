"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getOrCreateUserId,
  getUserName,
  setUserName,
} from "./lib/sessionStorage";
import type { QuizListItem } from "./lib/types";

export default function QuizListPage() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/quiz/history?userId=${encodeURIComponent(uid)}&list=1`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat quiz");
      setQuizzes(json.quizzes || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat quiz");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const uid = getOrCreateUserId();
    setUserId(uid);
    setName(getUserName());
    load(uid);
  }, [load]);

  const saveName = () => {
    if (name.trim()) setUserName(name.trim());
  };

  return (
    <div>
      <div className="card-quiz mb-6 p-4">
        <label className="block text-sm font-medium text-black/70">
          Nama peserta
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            placeholder="Masukkan nama Anda"
            className="min-w-[200px] flex-1 rounded-lg border border-black/15 px-3 py-2"
          />
          <button
            type="button"
            onClick={saveName}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Simpan
          </button>
        </div>
        {userId && (
          <p className="mt-2 text-xs text-black/45">
            ID: <code className="rounded bg-black/5 px-1">{userId.slice(0, 8)}…</code>
          </p>
        )}
      </div>

      {loading && <p className="text-black/60">Memuat daftar quiz…</p>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <p className="rounded-lg bg-black/5 p-6 text-center text-black/60">
          Belum ada quiz aktif. Hubungi admin untuk membuat quiz.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {quizzes.map((q) => (
          <article key={q.id} className="card-quiz flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-[var(--color-dark-blue)]">
                {q.title}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  q.active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-black/10 text-black/50"
                }`}
              >
                {q.active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            {q.description && (
              <p className="mt-2 text-sm text-black/65 line-clamp-2">{q.description}</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-black/50">Soal</dt>
                <dd className="font-semibold">{q.questionCount}</dd>
              </div>
              <div>
                <dt className="text-black/50">Durasi</dt>
                <dd className="font-semibold">{q.duration} menit</dd>
              </div>
              <div>
                <dt className="text-black/50">Passing Score</dt>
                <dd className="font-semibold">{q.passingScore}</dd>
              </div>
              <div>
                <dt className="text-black/50">Nilai Terakhir</dt>
                <dd className="font-semibold">
                  {q.lastScore != null ? (
                    <span className={q.lastPassed ? "text-emerald-700" : "text-red-700"}>
                      {q.lastScore} {q.lastPassed ? "✓" : "✗"}
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            <Link
              href={
                q.lastScore != null ? `/quiz/${q.id}?retake=1` : `/quiz/${q.id}`
              }
              className="mt-5 inline-flex justify-center rounded-lg bg-[var(--color-dark-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {q.lastScore != null ? "Ulangi Quiz" : "Start Quiz"}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
