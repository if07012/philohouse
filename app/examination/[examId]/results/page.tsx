"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { questionTypeLabel } from "../../components/QuestionBody";
import type { EvaluationItem, PublicExamQuestion } from "../../lib/types";
import { loadExamState } from "../../lib/examSessionStorage";

function ExamResultsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const sid = searchParams.get("sid")?.trim() ?? "";

  const [questions, setQuestions] = useState<PublicExamQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<EvaluationItem[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [source, setSource] = useState<"sheet" | "local" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadError(null);
      setLoading(true);

      if (sid) {
        try {
          const subRes = await fetch(
            `/api/examination/submission/${encodeURIComponent(sid)}?examId=${encodeURIComponent(examId)}`
          );
          const subJson = await subRes.json();
          if (!subRes.ok) {
            if (!cancelled) {
              setLoadError(subJson.error || "Could not load this report from the sheet.");
              setLoading(false);
            }
            return;
          }
          if (cancelled) return;

          setEvaluation(subJson.evaluation || []);
          setExplanations(subJson.explanations || {});
          setAnswers(subJson.answers || {});
          setSubmissionId(subJson.submission_id ?? sid);
          setSubmittedAt(subJson.submitted_at ?? null);
          setTitle(subJson.materialTitle || "Exam");
          setSource("sheet");

          const sessionRes = await fetch(
            `/api/examination/session/${encodeURIComponent(examId)}`
          );
          const sessionJson = await sessionRes.json();
          if (sessionRes.ok && !cancelled) {
            setQuestions(sessionJson.questions || []);
          }
        } catch {
          if (!cancelled) {
            setLoadError("Could not load report. Check your connection and try again.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      const stored = loadExamState(examId);
      if (!stored?.submitted || !stored.results) {
        if (!cancelled) {
          router.replace(`/examination/${examId}/preview`);
        }
        return;
      }

      setEvaluation(stored.results.evaluation);
      setExplanations(stored.results.explanations);
      setAnswers(stored.answers || {});
      setSubmissionId(stored.submissionId ?? null);
      setSource("local");

      const res = await fetch(`/api/examination/session/${encodeURIComponent(examId)}`);
      const json = await res.json();
      if (res.ok && !cancelled) {
        setQuestions(json.questions || []);
        setTitle(json.materialTitle || "Exam");
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [examId, router, sid]);

  const byId = useMemo(() => {
    const m = new Map<string, EvaluationItem>();
    for (const e of evaluation) m.set(e.question_id, e);
    return m;
  }, [evaluation]);

  const essayAvg = useMemo(() => {
    const essays = evaluation.filter(
      (e) => e.type === "essay" && e.score_percent != null
    );
    if (!essays.length) return null;
    const sum = essays.reduce((a, e) => a + (e.score_percent ?? 0), 0);
    return Math.round(sum / essays.length);
  }, [evaluation]);

  const objectiveCorrect = useMemo(() => {
    return evaluation.filter((e) => e.type !== "essay" && e.correct === true).length;
  }, [evaluation]);

  const objectiveTotal = useMemo(() => {
    return evaluation.filter((e) => e.type !== "essay").length;
  }, [evaluation]);

  const shareUrl =
    typeof window !== "undefined" && submissionId
      ? `${window.location.origin}/examination/${examId}/results?sid=${encodeURIComponent(submissionId)}`
      : null;

  const formatUserAnswer = (q: PublicExamQuestion): string => {
    const raw = (answers[q.question_id] ?? "").trim();
    if (!raw) return "No answer";
    if (q.type === "mcq_single") {
      const idx = raw.charCodeAt(0) - 65;
      if (idx >= 0 && idx < q.options.length) {
        return `${raw} — ${q.options[idx]}`;
      }
      return raw;
    }
    if (q.type === "mcq_multi") {
      const letters = raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (!letters.length) return "No answer";
      return letters
        .map((letter) => {
          const idx = letter.charCodeAt(0) - 65;
          return idx >= 0 && idx < q.options.length
            ? `${letter} — ${q.options[idx]}`
            : letter;
        })
        .join(", ");
    }
    return raw;
  };

  if (loading && !loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-black/60">Loading results…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-red-700">{loadError}</p>
        <p className="mt-4 text-sm text-black/60">
          Reports are stored in the <strong>ExamSubmissions</strong> tab. Use the link
          from Telegram or the address bar after you submit (it includes{" "}
          <code className="rounded bg-black/5 px-1">sid=</code>).
        </p>
        <Link
          href={`/examination/${examId}/preview`}
          className="mt-6 inline-block text-[var(--color-accent)] hover:underline"
        >
          Back to exam
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <nav className="mb-6 text-sm text-black/60">
          <Link href="/examination" className="text-[var(--color-accent)] hover:underline">
            All exams
          </Link>
        </nav>

        <h1 className="text-2xl font-bold">Results</h1>
        <p className="mt-1 text-black/70">{title}</p>

        {source === "sheet" && (
          <p className="mt-2 text-xs font-medium text-[var(--color-accent)]">
            Loaded from Google Sheets — you can open this link on any device.
          </p>
        )}

        {submissionId && (
          <p className="mt-2 text-xs text-black/50">
            Submission{" "}
            <code className="rounded bg-black/5 px-1">{submissionId.slice(0, 8)}…</code>
            {submittedAt
              ? ` · ${new Date(submittedAt).toLocaleString()}`
              : ""}
          </p>
        )}

        {shareUrl && source === "local" && (
          <p className="mt-3 text-xs text-black/55">
            Open this report elsewhere:{" "}
            <Link href={shareUrl} className="break-all text-[var(--color-accent)] underline">
              {shareUrl}
            </Link>
          </p>
        )}

        <div className="card-soft mt-6 grid gap-4 p-6 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--color-soft)]/80 p-4">
            <p className="text-sm text-black/60">Multiple choice & fill-in</p>
            <p className="text-2xl font-bold text-[var(--color-dark-blue)]">
              {objectiveCorrect} / {objectiveTotal} correct
            </p>
          </div>
          {essayAvg != null && (
            <div className="rounded-xl bg-[var(--color-soft)]/80 p-4">
              <p className="text-sm text-black/60">Essay average</p>
              <p className="text-2xl font-bold text-[var(--color-dark-blue)]">
                {essayAvg}%
              </p>
            </div>
          )}
        </div>

        <ol className="mt-8 space-y-8">
          {questions.map((q) => {
            const ev = byId.get(q.question_id);
            const ex = explanations[q.question_id];
            return (
              <li key={q.question_id} className="card-soft p-5">
                <p className="text-xs font-medium uppercase text-black/45">
                  Q{q.order_index} · {questionTypeLabel(q.type)}
                </p>
                <p className="mt-2 font-medium">{q.question_text}</p>
                <div className="mt-3 rounded-lg bg-black/[0.04] px-4 py-3 text-sm">
                  <p className="font-semibold text-black/75">Your answer</p>
                  <p className="mt-1 whitespace-pre-wrap text-black/80">
                    {formatUserAnswer(q)}
                  </p>
                </div>
                {ev && (
                  <div className="mt-4 rounded-lg bg-black/[0.04] px-4 py-3 text-sm">
                    {q.type === "essay" ? (
                      <p>
                        <span className="font-semibold">Score: </span>
                        {ev.score_percent ?? "—"}%
                      </p>
                    ) : (
                      <p>
                        <span className="font-semibold">Result: </span>
                        {ev.correct === true
                          ? "Correct"
                          : ev.correct === false
                            ? "Incorrect"
                            : "—"}
                      </p>
                    )}
                    {ev.feedback ? (
                      <p className="mt-2 text-black/75">{ev.feedback}</p>
                    ) : null}
                    {ex ? (
                      <p className="mt-2 text-black/60">
                        <span className="font-medium">Explanation: </span>
                        {ex}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-10">
          <Link
            href="/examination"
            className="inline-flex rounded-xl bg-[var(--color-accent)] px-6 py-3 font-semibold text-white"
          >
            Done
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ExamResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
          <p className="text-black/60">Loading…</p>
        </main>
      }
    >
      <ExamResultsContent />
    </Suspense>
  );
}
