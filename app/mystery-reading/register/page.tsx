"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MysteryRegisterPage() {
  const router = useRouter();
  const [parentLabel, setParentLabel] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setFamilyId(null);
    setLoading(true);
    try {
      const r = await fetch("/api/mystery-reading/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentLabel: parentLabel.trim(), pin }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Gagal mendaftar");
        return;
      }
      setFamilyId(j.familyId);
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
      <h1 className="text-2xl font-bold text-white mb-2">Daftar keluarga</h1>
      <p className="text-slate-400 text-sm mb-8">
        Satu akun untuk orang tua. Simpan Family ID untuk login berikutnya.
      </p>
      {familyId ? (
        <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-5 space-y-4">
          <p className="text-emerald-200 text-sm font-medium">Pendaftaran berhasil.</p>
          <div>
            <p className="text-xs text-slate-500 mb-1">Family ID (salin)</p>
            <code className="block break-all text-sm text-amber-200 bg-slate-900 rounded-lg p-3 border border-slate-800">
              {familyId}
            </code>
          </div>
          <button
            type="button"
            onClick={() => router.push("/mystery-reading/parent")}
            className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-950"
          >
            Tambah profil anak
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nama panggilan orang tua</label>
            <input
              value={parentLabel}
              onChange={(e) => setParentLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
              placeholder="Contoh: Ibu Rina"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">PIN keluarga (min 4 karakter)</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
            />
          </div>
          {err && <p className="text-rose-300 text-sm">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {loading ? "Memproses…" : "Buat akun"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-500">
        Sudah punya Family ID?{" "}
        <Link href="/mystery-reading/login" className="text-amber-300 underline">
          Login
        </Link>
      </p>
    </div>
  );
}
