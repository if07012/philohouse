"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ChildAnalytics = {
  childId: string;
  nickname: string;
  readingDays: number;
  attemptCount: number;
  avgScore: number;
  inferencePct: number;
  logicPct: number;
  vocabProxyPct: number;
  lastCompleted: string | null;
};

export default function MysteryParentPage() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState("");
  const [adding, setAdding] = useState(false);
  const [analytics, setAnalytics] = useState<ChildAnalytics[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const me = await fetch("/api/mystery-reading/me", { credentials: "include" });
      const mj = await me.json();
      if (!mj.authenticated) {
        setAuth(false);
        return;
      }
      setAuth(true);
      const a = await fetch("/api/mystery-reading/analytics", { credentials: "include" });
      const aj = await a.json();
      if (!a.ok) {
        setErr(aj.error || "Gagal memuat analitik");
        return;
      }
      setAnalytics((aj.children || []) as ChildAnalytics[]);
    } catch {
      setErr("Jaringan error");
      setAuth(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setErr(null);
    try {
      const r = await fetch("/api/mystery-reading/children", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Gagal menambah");
        return;
      }
      setNickname("");
      void load();
    } catch {
      setErr("Jaringan error");
    } finally {
      setAdding(false);
    }
  }

  if (auth === false) {
    return (
      <div className="px-4 pt-10 max-w-lg mx-auto space-y-4">
        <p className="text-slate-300">Silakan login sebagai orang tua.</p>
        <Link href="/mystery-reading/login" className="inline-block text-amber-300 underline">
          Ke halaman login
        </Link>
      </div>
    );
  }

  if (auth === null) {
    return <div className="px-4 pt-10 text-center text-slate-500">Memuat…</div>;
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto space-y-8">
      <div>
        <Link href="/mystery-reading" className="text-sm text-slate-500 hover:text-amber-300">
          ← Beranda
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">Dashboard orang tua</h1>
        <p className="text-slate-400 text-sm mt-1">
          Frekuensi membaca, skor, inferensi, logika, dan indikator kosakata (proxy).
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-amber-200 mb-3">Tambah profil anak</h2>
        <form onSubmit={addChild} className="flex gap-2">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nama panggilan"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={adding || !nickname.trim()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {adding ? "…" : "Tambah"}
          </button>
        </form>
        {err && <p className="text-rose-300 text-sm mt-2">{err}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Per anak
        </h2>
        {analytics.length === 0 ? (
          <p className="text-slate-500 text-sm">Belum ada data percobaan.</p>
        ) : (
          analytics.map((c) => (
            <div
              key={c.childId}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
            >
              <p className="font-semibold text-white">{c.nickname}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-slate-500">Hari baca (unik)</p>
                  <p className="text-amber-300 font-bold text-base">{c.readingDays}</p>
                </div>
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-slate-500">Percobaan</p>
                  <p className="text-amber-300 font-bold text-base">{c.attemptCount}</p>
                </div>
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-slate-500">Rata skor</p>
                  <p className="text-amber-300 font-bold text-base">{c.avgScore}%</p>
                </div>
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-slate-500">Inferensi</p>
                  <p className="text-violet-300 font-bold text-base">{c.inferencePct}%</p>
                </div>
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-slate-500">Logika</p>
                  <p className="text-violet-300 font-bold text-base">{c.logicPct}%</p>
                </div>
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-slate-500">Kosakata (proxy)</p>
                  <p className="text-emerald-300 font-bold text-base">{c.vocabProxyPct}%</p>
                </div>
              </div>
              {c.lastCompleted && (
                <p className="text-xs text-slate-500">Terakhir selesai: {c.lastCompleted}</p>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
