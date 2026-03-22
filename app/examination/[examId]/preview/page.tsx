"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { markdownToSafeHtml } from "../../lib/markdownToHtml";
import Link from "next/link";
import Markdown from 'react-markdown'
import {
  clearExamState,
  createFreshState,
  loadExamState,
  saveExamState,
} from "../../lib/examSessionStorage";

type SessionPreview = {
  examId: string;
  materialTitle: string;
  materialContent: string;
  questions: unknown[];
};

export default function MaterialPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [data, setData] = useState<SessionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ReturnType<typeof loadExamState>>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/examination/session/${encodeURIComponent(examId)}?includeMaterial=1`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData({
        examId: json.examId,
        materialTitle: json.materialTitle || "Study material",
        materialContent: json.materialContent || "",
        questions: json.questions || [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setExisting(loadExamState(examId));
  }, [examId, data]);

  const startFresh = () => {
    clearExamState(examId);
    const fresh = createFreshState(examId);
    saveExamState(fresh);
    setExisting(fresh);
    router.push(`/examination/${examId}/take`);
  };

  const continueExam = () => {
    router.push(`/examination/${examId}/take`);
  };

  const nQuestions = data?.questions?.length ?? 0;

  const materialHtml = useMemo(() => {
    const raw = data?.materialContent ?? "";
    if (!raw.trim()) return "";
    return markdownToSafeHtml(raw);
  }, [data?.materialContent]);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-black/60">
          <Link href="/examination" className="text-[var(--color-accent)] hover:underline">
            Exams
          </Link>
          <span aria-hidden>/</span>
          <span className="text-black/80">Read first</span>
        </nav>

        {loading && (
          <p className="text-center text-black/60">Loading your material…</p>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              {data.materialTitle}
            </h1>
            <p className="mt-2 text-sm text-black/65">
              Read this carefully. When you are ready, start the exam. You will see{" "}
              <strong>{nQuestions}</strong> question{nQuestions === 1 ? "" : "s"}, one
              at a time.
            </p>

            <article className="card-soft mt-6 max-h-[min(60vh,480px)] overflow-y-auto p-6 text-base text-[var(--color-fg)]">
              {materialHtml ? (
                
                <div
                  className="exam-material-md"
                  dangerouslySetInnerHTML={{ __html: materialHtml }}
                />
              ) : (
                <p className="text-black/55">
                  No text in the sheet for this topic. Ask your teacher to add content
                  to the <code className="rounded bg-black/5 px-1">content</code> column
                  in Google Sheets.
                </p>
              )}
            </article>

            {existing && !existing.submitted && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-medium">You have a saved exam on this device.</p>
                <p className="mt-1 text-amber-900/90">
                  Choose <strong>Continue exam</strong> below, or{" "}
                  <strong>Start new attempt</strong> to clear your answers and begin
                  again.
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {existing && !existing.submitted ? (
                <>
                  <button
                    type="button"
                    onClick={continueExam}
                    className="rounded-xl bg-[var(--color-accent)] px-8 py-3 text-lg font-bold text-white shadow-sm"
                  >
                    Continue exam
                  </button>
                  <button
                    type="button"
                    onClick={startFresh}
                    className="inline-flex items-center rounded-xl border-2 border-black/15 px-6 py-3 text-base font-medium"
                  >
                    Start new attempt
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startFresh}
                  className="rounded-xl bg-[var(--color-accent)] px-8 py-3 text-lg font-bold text-white shadow-sm"
                >
                  Start exam
                </button>
              )}
              <Link
                href="/examination"
                className="inline-flex items-center rounded-xl border-2 border-black/15 px-6 py-3 text-base font-medium"
              >
                Back
              </Link>
            </div>
            <p className="mt-4 text-xs text-black/50">
              Your answers are saved on this device as you go. “Start new attempt”
              clears your saved answers for this exam.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
