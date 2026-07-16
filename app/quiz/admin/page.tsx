"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { QuizRow } from "../lib/types";

export default function QuizAdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<(QuizRow & { questionCount: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration: 30,
    passingScore: 70,
    active: true,
  });

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/quiz/auth/status");
    const json = await res.json();
    setAuthenticated(json.authenticated === true);
  }, []);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz/quiz");
      const json = await res.json();
      if (res.ok) setQuizzes(json.quizzes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) loadQuizzes();
  }, [authenticated, loadQuizzes]);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/quiz/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setLoginError(json.error || "Login gagal");
      return;
    }
    setAuthenticated(true);
    loadQuizzes();
  };

  const logout = async () => {
    await fetch("/api/quiz/auth/login", { method: "DELETE" });
    setAuthenticated(false);
  };

  const createQuiz = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/quiz/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Gagal membuat quiz");
      return;
    }
    setShowCreate(false);
    setForm({ title: "", description: "", duration: 30, passingScore: 70, active: true });
    router.push(`/quiz/admin/${json.id}`);
  };

  const deleteQuiz = async (id: string, title: string) => {
    if (!confirm(`Hapus quiz "${title}"?`)) return;
    const res = await fetch(`/api/quiz/quiz/${id}`, { method: "DELETE" });
    if (res.ok) loadQuizzes();
    else {
      const json = await res.json();
      alert(json.error || "Gagal menghapus");
    }
  };

  const clearCache = async () => {
    if (
      !confirm(
        "Hapus semua cache Google Sheet? Data akan diambil ulang dari spreadsheet pada permintaan berikutnya."
      )
    ) {
      return;
    }
    setClearingCache(true);
    try {
      const res = await fetch("/api/quiz/cache/clear", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Gagal menghapus cache");
        return;
      }
      alert(`Cache berhasil dihapus (${json.cleared ?? 0} entri).`);
      loadQuizzes();
    } finally {
      setClearingCache(false);
    }
  };

  if (authenticated === null) {
    return <p className="text-black/60">Memeriksa sesi…</p>;
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-sm">
        <h2 className="text-xl font-bold text-[var(--color-dark-blue)]">Admin Login</h2>
        <form onSubmit={login} className="card-quiz mt-4 space-y-4 p-5">
          {loginError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{loginError}</p>
          )}
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--color-dark-blue)] py-2.5 font-semibold text-white"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[var(--color-dark-blue)]">Kelola Quiz</h2>
        <div className="flex gap-2">
          <Link
            href="/quiz/admin/report"
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium"
          >
            Report Semua Peserta
          </Link>
          <button
            type="button"
            onClick={clearCache}
            disabled={clearingCache}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-60"
          >
            {clearingCache ? "Menghapus cache…" : "Hapus Cache Sheet"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            + Buat Quiz
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={createQuiz} className="card-quiz mt-4 grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Judul</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Durasi (menit)</label>
            <input
              type="number"
              min={1}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Passing Score</label>
            <input
              type="number"
              min={0}
              value={form.passingScore}
              onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span className="text-sm">Aktif (publish)</span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-dark-blue)] px-5 py-2 font-semibold text-white"
            >
              Simpan & Kelola Soal
            </button>
          </div>
        </form>
      )}

      {loading && <p className="mt-4 text-black/60">Memuat…</p>}

      <div className="mt-6 space-y-3">
        {quizzes.map((q) => (
          <div
            key={q.id}
            className="card-quiz flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-bold text-[var(--color-dark-blue)]">{q.title}</p>
              <p className="text-sm text-black/55">
                {q.questionCount} soal · {q.duration} menit · passing {q.passingScore}
                {!q.active && " · nonaktif"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/quiz/admin/${q.id}`}
                className="rounded-lg bg-[var(--color-dark-blue)] px-4 py-2 text-sm font-semibold text-white"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => deleteQuiz(q.id, q.title)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
