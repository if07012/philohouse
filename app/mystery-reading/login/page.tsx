"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MysteryLoginPage() {
  const router = useRouter();
  const [familyId, setFamilyId] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/mystery-reading/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: familyId.trim(), pin }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Login gagal");
        return;
      }
      router.push("/mystery-reading");
      router.refresh();
    } catch {
      setErr("Jaringan error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pt-10 pb-8 max-w-md mx-auto">
      <Link href="/mystery-reading" className="text-sm text-slate-500 hover:text-amber-300 mb-6 inline-block">
        ← Beranda
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Login orang tua</h1>
      <p className="text-slate-400 text-sm mb-8">
        Gunakan Family ID dari pendaftaran dan PIN keluarga.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Family ID</label>
          <input
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
            autoComplete="username"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-rose-300 text-sm">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-950 disabled:opacity-50"
        >
          {loading ? "Memproses…" : "Masuk"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link href="/mystery-reading/register" className="text-amber-300 underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}
