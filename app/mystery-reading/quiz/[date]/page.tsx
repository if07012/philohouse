"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CHILD_KEY = "mystery_selected_child_id";

type PublicQ = {
  question_id: string;
  kind: string;
  question: string;
  options: [string, string, string, string];
};

type ReviewRow = {
  question_id: string;
  kind: string;
  question: string;
  options: string[];
  chosen: number;
  correct_index: number;
  explanation: string;
  correct: boolean;
};

export default function MysteryQuizPage() {
  const params = useParams();
  const date = decodeURIComponent(String(params?.date || ""));
  const [questions, setQuestions] = useState<PublicQ[]>([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    scorePercent: number;
    xpAwarded: number;
    newXp: number;
    newLevel: number;
    streak: number;
    badges: string[];
    review: ReviewRow[];
    vocabProxyPct: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/mystery-reading/daily/${encodeURIComponent(date)}`);
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Gagal memuat");
        return;
      }
      setTitle(j.title || "Kuis");
      const qs = (j.quiz?.questions || []) as PublicQ[];
      setQuestions(qs);
      setAnswers(Array(qs.length).fill(-1));
    } catch {
      setErr("Jaringan error");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const pick = (idx: number) => {
    const next = [...answers];
    next[step] = idx;
    setAnswers(next);
  };

  const submit = async () => {
    if (answers.some((a) => a < 0 || a > 3)) {
      setErr("Jawab semua soal dulu ya.");
      return;
    }
    const childId = typeof window !== "undefined" ? localStorage.getItem(CHILD_KEY) : null;
    if (!childId) {
      setErr("Pilih profil anak di beranda (login orang tua) agar skor tersimpan.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const r = await fetch("/api/mystery-reading/attempts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          storyDate: date,
          answers,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Gagal mengirim");
        return;
      }
      setResult({
        scorePercent: j.scorePercent,
        xpAwarded: j.xpAwarded,
        newXp: j.newXp,
        newLevel: j.newLevel,
        streak: j.streak,
        badges: j.badges || [],
        review: j.review || [],
        vocabProxyPct: j.vocabProxyPct ?? 0,
      });
    } catch {
      setErr("Jaringan error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-8 max-w-lg mx-auto text-center text-slate-500">Memuat kuis…</div>
    );
  }
  if (err && !questions.length) {
    return (
      <div className="px-4 pt-8 max-w-lg mx-auto space-y-4">
        <p className="text-amber-200">{err}</p>
        <Link href="/mystery-reading" className="text-violet-300 underline text-sm">
          Beranda
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="px-4 pt-6 pb-8 max-w-lg mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white">Hasil kuis</h1>
        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-2xl font-bold text-amber-300">{result.scorePercent}%</p>
            <p className="text-slate-500">Skor</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-2xl font-bold text-violet-300">+{result.xpAwarded}</p>
            <p className="text-slate-500">XP</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-xl font-bold text-white">Lv {result.newLevel}</p>
            <p className="text-slate-500">Total XP {result.newXp}</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-xl font-bold text-emerald-300">{result.streak} hari</p>
            <p className="text-slate-500">Streak</p>
          </div>
        </div>
        {result.badges.length > 0 && (
          <p className="text-sm text-amber-200">Lencana baru: {result.badges.join(", ")}</p>
        )}
        <p className="text-xs text-slate-500">
          Indikator kosakata (fakta+urutan): {result.vocabProxyPct}%
        </p>

        <h2 className="text-sm font-semibold text-slate-400">Tinjauan jawaban</h2>
        <ul className="space-y-4">
          {result.review.map((row, i) => (
            <li
              key={row.question_id}
              className={`rounded-xl border p-4 text-sm ${
                row.correct ? "border-emerald-800/60 bg-emerald-950/30" : "border-rose-900/50 bg-rose-950/20"
              }`}
            >
              <p className="text-xs text-slate-500 mb-1">
                #{i + 1} · {row.kind}
              </p>
              <p className="text-slate-200 mb-2">{row.question}</p>
              <p className="text-slate-400 text-xs mb-2">{row.explanation}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/mystery-reading"
          className="block text-center rounded-2xl bg-amber-500 py-3 font-semibold text-slate-950"
        >
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const q = questions[step];
  const labels = ["A", "B", "C", "D"];

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      <Link href={`/mystery-reading/story/${encodeURIComponent(date)}`} className="text-sm text-slate-500 hover:text-amber-300 mb-4 inline-block">
        ← Cerita
      </Link>
      <p className="text-xs text-slate-500 truncate">{title}</p>
      <div className="flex justify-between items-center mt-2 mb-6">
        <span className="text-sm text-amber-200">
          Soal {step + 1} / {questions.length}
        </span>
        <span className="text-xs uppercase text-slate-500">{q?.kind}</span>
      </div>

      {err && <p className="text-rose-300 text-sm mb-4">{err}</p>}

      {q && (
        <>
          <p className="text-lg text-white font-medium leading-snug mb-6">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => pick(idx)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${
                  answers[step] === idx
                    ? "border-amber-400 bg-amber-500/10 text-amber-50"
                    : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500"
                }`}
              >
                <span className="font-semibold text-amber-400/90 mr-2">{labels[idx]}.</span>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 rounded-xl border border-slate-600 py-3 text-sm font-medium text-slate-300"
          >
            Sebelumnya
          </button>
        )}
        {step < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={answers[step] < 0}
            className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Berikutnya
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || answers.some((a) => a < 0)}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Mengirim…" : "Kirim jawaban"}
          </button>
        )}
      </div>
    </div>
  );
}
