"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXAM_GENERATION_COUNTS } from "./lib/constants";

type Material = {
  material_id: string;
  title: string;
  content: string;
  image_url: string;
};
type ExamMeta = {
  exam_id: string;
  material_id: string;
  material_title: string;
  created_at: string;
};

export default function ExaminationHubPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [exams, setExams] = useState<ExamMeta[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [loadingExams, setLoadingExams] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [llmProvider, setLlmProvider] = useState<"groq" | "ollama">("groq");

  const refreshMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    setError(null);
    try {
      const res = await fetch("/api/examination/materials");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load materials");
      setMaterials(data.materials || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load materials");
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  const refreshExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await fetch("/api/examination/exams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load exams");
      setExams(data.exams || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load exams");
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    refreshMaterials();
    refreshExams();
  }, [refreshMaterials, refreshExams]);

  const generateExam = async (materialId: string) => {
    setGeneratingId(materialId);
    setError(null);
    try {
      const res = await fetch("/api/examination/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, llmProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      await refreshExams();
      router.push(`/examination/${data.examId}/preview`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGeneratingId(null);
    }
  };

  const c = EXAM_GENERATION_COUNTS;
  const countsSummary = `${c.mcq_single} single MCQ · ${c.mcq_multi} multi MCQ · ${c.fill_blank} fill-in · ${c.essay} essays`;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-accent)]">Grade 4</p>
            <h1 className="text-3xl font-bold tracking-tight">Examination</h1>
            <p className="mt-2 max-w-xl text-sm text-black/70">
              Pick an exam to read the material, then answer one question at a time.
              Each exam has {countsSummary}. Results are saved to your Google Sheet.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Home
          </Link>
        </div>

        {error && (
          <div
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="card-soft mb-8 p-6">
          <h2 className="text-lg font-semibold">Learning materials</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-black/65">Generate with:</span>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="llmProvider"
                checked={llmProvider === "groq"}
                onChange={() => setLlmProvider("groq")}
                className="accent-[var(--color-accent)]"
              />
              Groq (cloud)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="llmProvider"
                checked={llmProvider === "ollama"}
                onChange={() => setLlmProvider("ollama")}
                className="accent-[var(--color-accent)]"
              />
              Ollama (local)
            </label>
          </div>
          <p className="mt-1 text-sm text-black/65">
            Tab <code className="rounded bg-black/5 px-1">Materials</code>:{" "}
            <code className="rounded bg-black/5 px-1">material_id</code>,{" "}
            <code className="rounded bg-black/5 px-1">title</code>,{" "}
            <code className="rounded bg-black/5 px-1">content</code>,{" "}
            <code className="rounded bg-black/5 px-1">image_url</code>.
          </p>
          {loadingMaterials ? (
            <p className="mt-4 text-sm text-black/60">Loading…</p>
          ) : materials.length === 0 ? (
            <p className="mt-4 text-sm text-black/60">No materials in the sheet yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {materials.map((m) => (
                <li
                  key={m.material_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white/80 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-black/50">ID: {m.material_id}</p>
                  </div>
                  <button
                    type="button"
                    disabled={generatingId === m.material_id}
                    onClick={() => generateExam(m.material_id)}
                    className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {generatingId === m.material_id ? "Generating…" : "Generate exam"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Your exams</h2>
            <button
              type="button"
              onClick={() => refreshExams()}
              className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Refresh
            </button>
          </div>
          {loadingExams ? (
            <p className="mt-4 text-sm text-black/60">Loading…</p>
          ) : exams.length === 0 ? (
            <p className="mt-4 text-sm text-black/60">
              No exams yet. Generate one from a material.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {exams.map((ex) => (
                <li key={ex.exam_id}>
                  <Link
                    href={`/examination/${ex.exam_id}/preview`}
                    className="block w-full rounded-lg border border-black/10 px-4 py-3 text-left text-sm transition hover:bg-black/[0.03]"
                  >
                    <span className="font-medium">{ex.material_title}</span>
                    <span className="mt-1 block text-xs text-black/55">
                      {ex.created_at
                        ? new Date(ex.created_at).toLocaleString()
                        : ""}{" "}
                      · Open to read material and start
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
