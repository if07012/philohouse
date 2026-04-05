"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QuestionBody } from "../../components/QuestionBody";
import { useNavigationGuard } from "../../hooks/useNavigationGuard";
import type {
  EvaluationItem,
  ExamAnswerAttemptEntry,
  PublicExamQuestion,
} from "../../lib/types";
import {
  buildPersistedState,
  loadExamState,
  hasAnswerForQuestion,
  mergeMultiIntoAnswers,
  multiSelectionsFromState,
  saveExamState,
} from "../../lib/examSessionStorage";

export default function ExamReviewPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [questions, setQuestions] = useState<PublicExamQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiSelections, setMultiSelections] = useState<
    Record<string, Set<string>>
  >({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [hintUsed, setHintUsed] = useState<Record<string, boolean>>({});
  const [answerHistory, setAnswerHistory] = useState<
    Record<string, ExamAnswerAttemptEntry[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [guardActive, setGuardActive] = useState(false);

  const persistAll = useCallback(
    (
      nextAnswers: Record<string, string>,
      nextMulti: Record<string, Set<string>>,
      nextFlagged: Record<string, boolean>,
      nextHintUsed: Record<string, boolean>,
      nextHistory?: Record<string, ExamAnswerAttemptEntry[]>
    ) => {
      const prev = loadExamState(examId);
      saveExamState(
        buildPersistedState({
          examId,
          answers: nextAnswers,
          multiSelections: nextMulti,
          flagged: nextFlagged,
          hintUsed: nextHintUsed,
          answerHistory: nextHistory ?? prev?.answerHistory ?? {},
          currentIndex: prev?.currentIndex ?? 0,
          submitted: false,
          submissionId: prev?.submissionId,
          results: prev?.results,
        })
      );
    },
    [examId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/examination/session/${encodeURIComponent(examId)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        if (cancelled) return;
        const qs: PublicExamQuestion[] = json.questions || [];
        setQuestions(qs);
        setTitle(json.materialTitle || "Exam");

        const stored = loadExamState(examId);
        if (stored?.submitted && stored.results) {
          router.replace(`/examination/${examId}/results`);
          return;
        }
        if (stored && stored.examId === examId) {
          setAnswers(stored.answers);
          setMultiSelections(multiSelectionsFromState(stored.multiAnswers));
          setFlagged(stored.flagged);
          setHintUsed(stored.hintUsed ?? {});
          setAnswerHistory(stored.answerHistory ?? {});
        } else {
          router.replace(`/examination/${examId}/preview`);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, router]);

  useEffect(() => {
    const s = loadExamState(examId);
    setGuardActive(Boolean(questions.length && !s?.submitted));
  }, [questions.length, examId]);

  useNavigationGuard(guardActive);

  const flaggedQuestions = questions.filter((q) => flagged[q.question_id]);
  const flaggedIds = flaggedQuestions.map((q) => q.question_id);
  const hintQuestionIds = questions
    .filter((q) => Boolean(hintUsed[q.question_id]))
    .map((q) => q.question_id);

  const submitFinal = async () => {
    setError(null);

    const firstMissingIdx = questions.findIndex(
      (qq) => !hasAnswerForQuestion(qq, answers, multiSelections)
    );
    if (firstMissingIdx !== -1) {
      router.push(
        `/examination/${examId}/take?q=${Math.max(1, firstMissingIdx + 1)}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const multiSerialized: Record<string, string> = {};
      for (const q of questions) {
        if (q.type === "mcq_multi") {
          const set = multiSelections[q.question_id] || new Set<string>();
          multiSerialized[q.question_id] = [...set].sort().join(",");
        }
      }
      const merged = mergeMultiIntoAnswers(questions, answers, multiSerialized);

      const historyPayload = loadExamState(examId)?.answerHistory ?? answerHistory;

      const res = await fetch("/api/examination/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          answers: merged,
          flaggedQuestionIds: flaggedIds,
          hintQuestionIds,
          answerHistory: historyPayload,
          persist: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submit failed");

      const prev = loadExamState(examId);
      saveExamState(
        buildPersistedState({
          examId,
          answers,
          multiSelections,
          flagged,
          hintUsed,
          answerHistory: historyPayload,
          currentIndex: prev?.currentIndex ?? 0,
          submitted: true,
          submissionId: json.submissionId,
          results: {
            evaluation: json.evaluation as EvaluationItem[],
            explanations: json.explanations as Record<string, string>,
          },
        })
      );
      const sid = json.submissionId as string | undefined;
      router.push(
        sid
          ? `/examination/${examId}/results?sid=${encodeURIComponent(sid)}`
          : `/examination/${examId}/results`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-black/60">Loading…</p>
      </main>
    );
  }

  if (error && !questions.length) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-red-700">{error}</p>
        <Link href="/examination" className="mt-4 inline-block text-[var(--color-accent)]">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-black/60">
          <Link href="/examination" className="text-[var(--color-accent)] hover:underline">
            Exams
          </Link>
          <span>/</span>
          <Link
            href={`/examination/${examId}/take`}
            className="text-[var(--color-accent)] hover:underline"
          >
            Questions
          </Link>
          <span>/</span>
          <span className="text-black/80">Review</span>
        </nav>

        <h1 className="text-2xl font-bold">Review</h1>
        <p className="mt-2 text-sm text-black/70">{title}</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="card-soft mt-6 p-6">
          <h2 className="text-lg font-semibold">Flagged questions</h2>
          <p className="mt-1 text-sm text-black/65">
            Change your answers if you want. Then submit — your work is sent to the
            teacher&apos;s sheet and scored.
          </p>

          {flaggedQuestions.length === 0 ? (
            <p className="mt-6 rounded-lg bg-black/[0.04] p-4 text-sm text-black/70">
              You did not flag any questions. You can still submit, or go back to the
              exam to add flags.
            </p>
          ) : (
            <ul className="mt-6 space-y-10">
              {flaggedQuestions.map((q) => (
                <li
                  key={q.question_id}
                  className="border-b border-black/10 pb-10 last:border-0 last:pb-0"
                >
                  <QuestionBody
                    q={q}
                    answers={answers}
                    multiSelections={multiSelections}
                    onSingle={(letter) => {
                      const next = { ...answers, [q.question_id]: letter };
                      setAnswers(next);
                      persistAll(next, multiSelections, flagged, hintUsed);
                    }}
                    onToggleMulti={(letter) => {
                      const set = new Set(multiSelections[q.question_id] || []);
                      if (set.has(letter)) set.delete(letter);
                      else set.add(letter);
                      const nextM = { ...multiSelections, [q.question_id]: set };
                      setMultiSelections(nextM);
                      persistAll(answers, nextM, flagged, hintUsed);
                    }}
                    onText={(value) => {
                      const next = { ...answers, [q.question_id]: value };
                      setAnswers(next);
                      persistAll(next, multiSelections, flagged, hintUsed);
                    }}
                  />
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-[var(--color-accent)]"
                    onClick={() => {
                      const next = { ...flagged, [q.question_id]: false };
                      setFlagged(next);
                      persistAll(answers, multiSelections, next, hintUsed);
                    }}
                  >
                    Remove flag
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/examination/${examId}/take`}
            className="inline-flex items-center rounded-lg border-2 border-black/15 px-5 py-2.5 font-medium"
          >
            Back to exam
          </Link>
          <button
            type="button"
            disabled={submitting}
            onClick={submitFinal}
            className="rounded-lg bg-[var(--color-dark-blue)] px-6 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit final answers"}
          </button>
        </div>
      </div>
    </main>
  );
}
