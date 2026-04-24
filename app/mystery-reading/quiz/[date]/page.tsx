"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

type DailyPayload = {
  story_date: string;
  title: string;
  summary: string;
  content_md: string;
  clues: string[];
  characters: { name: string; role: string }[];
  image_url: string;
  difficulty_band: string;
};

export default function MysteryQuizPage() {
  const params = useParams();
  const date = decodeURIComponent(String(params?.date || ""));
  const [questions, setQuestions] = useState<PublicQ[]>([]);
  const [title, setTitle] = useState("");
  const [material, setMaterial] = useState<DailyPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [result, setResult] = useState<{
    scorePercent: number;
    xpAwarded: number;
    badges: string[];
    review: ReviewRow[];
    vocabProxyPct: number;
    completedAt?: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setErr(null);
    try {
      const childId =
        typeof window !== "undefined" ? localStorage.getItem(CHILD_KEY) : null;
      const r = await fetch(
        `/api/mystery-reading/daily/${encodeURIComponent(date)}`
      );
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Gagal memuat");
        return;
      }
      setTitle(j.title || "Kuis");
      setMaterial(j as DailyPayload);

      if (childId) {
        const s = await fetch(
          `/api/mystery-reading/attempts?childId=${encodeURIComponent(
            childId
          )}&storyDate=${encodeURIComponent(date)}&includeReview=1`,
          { credentials: "include" }
        );
        const sj = await s.json().catch(() => ({}));
        if (s.ok && sj?.submitted) {
          setAlreadySubmitted(true);
          setQuestions([]);
          setAnswers([]);
          setStep(0);
          setResult({
            scorePercent: Number(sj.scorePercent) || 0,
            xpAwarded: Number(sj.xpAwarded) || 0,
            badges: Array.isArray(sj?.child?.badges) ? sj.child.badges : [],
            review: Array.isArray(sj.review) ? sj.review : [],
            vocabProxyPct: Number(sj.vocabProxyPct) || 0,
            completedAt:
              typeof sj.completedAt === "string" ? sj.completedAt : undefined,
          });
          return;
        }
      }

      const qs = (j.quiz?.questions || []) as PublicQ[];
      setQuestions(qs);
      setAnswers(Array(qs.length).fill(-1));
      setAlreadySubmitted(false);
      setResult(null);
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
        badges: j.badges || [],
        review: j.review || [],
        vocabProxyPct: j.vocabProxyPct ?? 0,
        completedAt: typeof j.completedAt === "string" ? j.completedAt : undefined,
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
        {alreadySubmitted && (
          <p className="text-xs text-slate-500">
            Kamu bisa lihat progres di beranda / profil anak.
          </p>
        )}
        <Link href="/mystery-reading" className="text-violet-300 underline text-sm">
          Beranda
        </Link>
      </div>
    );
  }

  if (result) {
    const labels = ["A", "B", "C", "D"];
    const showImg = material?.image_url?.startsWith("http");
    return (
      <div className="px-4 pt-6 pb-10 max-w-lg mx-auto space-y-8">
        <Link
          href={`/mystery-reading/story/${encodeURIComponent(date)}`}
          className="text-sm text-slate-500 hover:text-amber-300 inline-block"
        >
          ← Cerita
        </Link>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Hasil kuis</h1>
          {result.completedAt && (
            <p className="text-xs text-slate-500">
              Disubmit: {new Date(result.completedAt).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-slate-500">
            Kuis sudah di-submit dan tidak bisa diambil kembali.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-2xl font-bold text-amber-300">
              {result.scorePercent}%
            </p>
            <p className="text-slate-500">Skor</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-2xl font-bold text-violet-300">
              +{result.xpAwarded}
            </p>
            <p className="text-slate-500">XP</p>
          </div>
        </div>

        {result.badges.length > 0 && (
          <p className="text-sm text-amber-200">
            Lencana: {result.badges.join(", ")}
          </p>
        )}

        <p className="text-xs text-slate-500">
          Indikator kosakata (fakta+urutan): {result.vocabProxyPct}%
        </p>

        <h2 className="text-sm font-semibold text-slate-400">Tinjauan jawaban</h2>
        <ul className="space-y-4">
          {result.review.map((row, i) => (
            <li
              key={row.question_id}
              className={`rounded-xl border p-4 text-sm ${row.correct
                  ? "border-emerald-800/60 bg-emerald-950/30"
                  : "border-rose-900/50 bg-rose-950/20"
                }`}
            >
              <p className="text-xs text-slate-500 mb-1">
                #{i + 1} · {row.kind}
              </p>
              <p className="text-slate-200 mb-3">{row.question}</p>

              <div className="space-y-2">
                {row.options.map((opt, idx) => {
                  const isCorrect = idx === row.correct_index;
                  const isChosen = idx === row.chosen;
                  const base =
                    "rounded-lg border px-3 py-2 text-xs leading-relaxed";
                  const style = isCorrect
                    ? "border-emerald-700/70 bg-emerald-950/40 text-emerald-100"
                    : isChosen
                      ? "border-amber-600/70 bg-amber-950/30 text-amber-100"
                      : "border-slate-800 bg-slate-900/40 text-slate-300";
                  const tag = isCorrect
                    ? "Jawaban benar"
                    : isChosen
                      ? "Pilihan kamu"
                      : "";
                  return (
                    <div key={idx} className={`${base} ${style}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-semibold mr-2">
                            {labels[idx]}.
                          </span>
                          {opt}
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-300/80">
                          {tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {row.explanation ? (
                <p className="mt-3 text-slate-400 text-xs">{row.explanation}</p>
              ) : null}
            </li>
          ))}
        </ul>

        {material && (
          <section className="pt-2 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400">Materi</h2>

            {showImg && (
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-800">
                <img
                  src={material.image_url}
                  alt=""
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                />
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-amber-400/90 font-semibold uppercase tracking-widest mb-1">
                {material.story_date}
                {material.difficulty_band ? ` · ${material.difficulty_band}` : ""}
              </p>
              <p className="text-lg font-semibold text-white">{material.title}</p>
              {material.summary ? (
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  {material.summary}
                </p>
              ) : null}
            </div>

            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-amber-100 prose-p:text-slate-300 prose-strong:text-white">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-8 border-b pb-4">
                      {children}
                    </h1>
                  ),

                  h2: ({ children }) => (
                    <h2 className="text-2xl md:text-2xl font-bold text-white-800 mt-12 mb-4 relative pl-4 border-l-4 border-indigo-500">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="text-2xl font-semibold text-gray-700 mt-8 mb-3">
                      {children}
                    </h3>
                  ),

                  p: ({ children }) => (
                    <p className="text-lg leading-8 text-gray-600 mb-5">
                      {children}
                    </p>
                  ),

                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-6">
                      {children}
                    </ol>
                  ),

                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-500 bg-indigo-50 italic px-5 py-3 rounded-r-xl my-6 text-gray-700">
                      {children}
                    </blockquote>
                  ),

                  code: ({ children }) => (
                    <code className="bg-gray-100 px-2 py-1 rounded text-pink-600 text-sm">
                      {children}
                    </code>
                  ),
                }}
              >{material?.content_md}</ReactMarkdown>
            </div>
          </section>
        )}

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
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${answers[step] === idx
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
