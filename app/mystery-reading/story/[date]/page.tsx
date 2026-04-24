"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CHILD_KEY = "mystery_selected_child_id";

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

export default function MysteryStoryPage() {
  const params = useParams();
  const date = decodeURIComponent(String(params?.date || ""));
  const [data, setData] = useState<DailyPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/mystery-reading/daily/${encodeURIComponent(date)}`);
        const j = await r.json();
        if (!r.ok) {
          if (!cancelled) setErr(j.error || "Gagal memuat");
          return;
        }
        if (!cancelled) setData(j as DailyPayload);
      } catch {
        if (!cancelled) setErr("Jaringan error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    (async () => {
      const childId =
        typeof window !== "undefined" ? localStorage.getItem(CHILD_KEY) : null;
      if (!childId) {
        if (!cancelled) setQuizSubmitted(false);
        return;
      }
      try {
        const r = await fetch(
          `/api/mystery-reading/attempts?childId=${encodeURIComponent(
            childId
          )}&storyDate=${encodeURIComponent(date)}`,
          { credentials: "include" }
        );
        const j = await r.json().catch(() => ({}));
        if (!cancelled) setQuizSubmitted(Boolean(r.ok && j?.submitted));
      } catch {
        if (!cancelled) setQuizSubmitted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (loading) {
    return (
      <div className="px-4 pt-8 max-w-lg mx-auto text-center text-slate-500">Memuat cerita…</div>
    );
  }
  if (err || !data) {
    return (
      <div className="px-4 pt-8 max-w-lg mx-auto space-y-4">
        <p className="text-amber-200">{err || "Tidak ditemukan"}</p>
        <Link href="/mystery-reading" className="text-violet-300 underline text-sm">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const showImg = data.image_url?.startsWith("http");

  return (
    <article className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <Link href="/mystery-reading" className="text-sm text-slate-500 hover:text-amber-300 mb-4 inline-block">
        ← Beranda
      </Link>

      {showImg && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-800 mb-5">
          <img
            src={data.image_url}
            alt=""
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
          />
        </div>
      )}

      <p className="text-xs text-amber-400/90 font-semibold uppercase tracking-widest mb-1">
        {data.story_date}
        {data.difficulty_band ? ` · ${data.difficulty_band}` : ""}
      </p>
      <h1 className="text-4xl font-bold text-white leading-tight">{data.title}</h1>
      <p className="mt-3 text-slate-400 text-sm leading-relaxed">{data.summary}</p>

      <div className="mt-6 prose prose-invert prose-sm max-w-none prose-headings:text-amber-100 prose-p:text-slate-300 prose-strong:text-white">
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
        >{data.content_md}</ReactMarkdown>
      </div>

      {data.characters.length > 0 && (
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-sm font-semibold text-amber-200 mb-2">Tokoh</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {data.characters.map((c) => (
              <li key={c.name}>
                <span className="text-white font-medium">{c.name}</span> — {c.role}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.clues.length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-sm font-semibold text-amber-200 mb-2">Petunjuk</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
            {data.clues.map((clue, i) => (
              <li key={i}>{clue}</li>
            ))}
          </ul>
        </section>
      )}

      {quizSubmitted ? (
        <Link
          href={`/mystery-reading/quiz/${encodeURIComponent(date)}`}
          className="mt-8 mb-4 block text-center rounded-2xl bg-slate-900/60 border border-slate-800 py-4 font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-900/70 transition"
        >
          Lihat hasil kuis
        </Link>
      ) : (
        <Link
          href={`/mystery-reading/quiz/${encodeURIComponent(date)}`}
          className="mt-8 mb-4 block text-center rounded-2xl bg-violet-600 py-4 font-semibold text-white hover:bg-violet-500 transition"
        >
          Lanjut ke kuis
        </Link>
      )}
    </article>
  );
}
