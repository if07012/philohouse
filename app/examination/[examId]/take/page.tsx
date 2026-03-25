"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { QuestionBody } from "../../components/QuestionBody";
import { useNavigationGuard } from "../../hooks/useNavigationGuard";
import type { PublicExamQuestion } from "../../lib/types";
import {
  buildPersistedState,
  createFreshState,
  hasAnswerForQuestion,
  loadExamState,
  multiSelectionsFromState,
  saveExamState,
} from "../../lib/examSessionStorage";

function ExamTakeContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerConfirmed, setAnswerConfirmed] = useState(true);
  const [guardActive, setGuardActive] = useState(false);

  const persist = useCallback(
    (patch: Partial<{
      answers: Record<string, string>;
      multiSelections: Record<string, Set<string>>;
      flagged: Record<string, boolean>;
      currentIndex: number;
    }>) => {
      const nextAnswers = patch.answers ?? answers;
      const nextMulti = patch.multiSelections ?? multiSelections;
      const nextFlagged = patch.flagged ?? flagged;
      const nextIdx = patch.currentIndex ?? currentIndex;
      const prev = loadExamState(examId);
      saveExamState(
        buildPersistedState({
          examId,
          answers: nextAnswers,
          multiSelections: nextMulti,
          flagged: nextFlagged,
          currentIndex: nextIdx,
          submitted: prev?.submitted ?? false,
          submissionId: prev?.submissionId,
          results: prev?.results,
        })
      );
    },
    [answers, multiSelections, flagged, currentIndex, examId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/examination/session/${encodeURIComponent(examId)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load exam");
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
          const qParam = searchParams.get("q");
          if (qParam) {
            const n = Math.max(1, parseInt(qParam, 10) || 1);
            setCurrentIndex(Math.min(n - 1, Math.max(0, qs.length - 1)));
          } else {
            setCurrentIndex(
              Math.min(stored.currentIndex, Math.max(0, qs.length - 1))
            );
          }
        } else {
          const fresh = createFreshState(examId);
          const initialMulti: Record<string, Set<string>> = {};
          for (const q of qs) {
            if (q.type === "mcq_multi") initialMulti[q.question_id] = new Set();
          }
          saveExamState({ ...fresh, multiAnswers: {} });
          setMultiSelections(initialMulti);
          const qParam = searchParams.get("q");
          if (qParam) {
            const n = Math.max(1, parseInt(qParam, 10) || 1);
            setCurrentIndex(Math.min(n - 1, Math.max(0, qs.length - 1)));
          }
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
  }, [examId, router, searchParams]);

  const total = questions.length;
  const q = questions[currentIndex];
  const isLast = currentIndex >= total - 1;

  useEffect(() => {
    setAnswerConfirmed(true);
  }, [currentIndex]);

  useEffect(() => {
    if (!questions.length) {
      setGuardActive(false);
      return;
    }
    const s = loadExamState(examId);
    setGuardActive(!s?.submitted);
  }, [questions.length, examId, currentIndex]);

  useNavigationGuard(guardActive);

  const updateAnswers = (next: Record<string, string>) => {
    setAnswers(next);
    persist({ answers: next });
  };

  const updateMulti = (next: Record<string, Set<string>>) => {
    setMultiSelections(next);
    persist({ multiSelections: next });
  };

  const updateFlagged = (next: Record<string, boolean>) => {
    setFlagged(next);
    persist({ flagged: next });
  };

  const toggleFlag = () => {
    if (!q) return;
    const next = { ...flagged, [q.question_id]: !flagged[q.question_id] };
    updateFlagged(next);
  };

  const canGoNext =
    q &&
    hasAnswerForQuestion(q, answers, multiSelections) &&
    answerConfirmed;

  const goNext = () => {
    if (!canGoNext || !q) return;
    if (isLast) {
      const firstMissingIdx = questions.findIndex(
        (qq) => !hasAnswerForQuestion(qq, answers, multiSelections)
      );
      if (firstMissingIdx !== -1) {
        router.push(
          `/examination/${examId}/take?q=${Math.max(1, firstMissingIdx + 1)}`
        );
        return;
      }
      router.push(`/examination/${examId}/review`);
      return;
    }
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    persist({ currentIndex: nextIdx });
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    const nextIdx = currentIndex - 1;
    setCurrentIndex(nextIdx);
    persist({ currentIndex: nextIdx });
  };

  const progress = useMemo(() => {
    if (total === 0) return 0;
    return Math.round(((currentIndex + 1) / total) * 100);
  }, [currentIndex, total]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-black/60">Loading…</p>
      </main>
    );
  }

  if (error || !q) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-red-700">{error || "No questions."}</p>
        <Link href="/examination" className="mt-4 inline-block text-[var(--color-accent)]">
          Back to exams
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
            href={`/examination/${examId}/preview`}
            className="text-[var(--color-accent)] hover:underline"
          >
            Material
          </Link>
          <span>/</span>
          <span className="text-black/80">Questions</span>
        </nav>

        <div className="mb-4">
          <div className="flex justify-between text-sm font-medium text-black/70">
            <span>
              Question {currentIndex + 1} of {total}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-black/10"
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          >
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="text-lg font-semibold text-[var(--color-dark-blue)]">{title}</p>

        <section className="card-soft mt-4 p-6">
          <QuestionBody
            q={q}
            answers={answers}
            multiSelections={multiSelections}
            onSingle={(letter) => {
              const next = { ...answers, [q.question_id]: letter };
              updateAnswers(next);
            }}
            onToggleMulti={(letter) => {
              const set = new Set(multiSelections[q.question_id] || []);
              if (set.has(letter)) set.delete(letter);
              else set.add(letter);
              const next = { ...multiSelections, [q.question_id]: set };
              updateMulti(next);
            }}
            onText={(value) => {
              const next = { ...answers, [q.question_id]: value };
              updateAnswers(next);
            }}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6">
            <button
              type="button"
              onClick={toggleFlag}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold ${
                flagged[q.question_id]
                  ? "border-amber-500 bg-amber-100 text-amber-950"
                  : "border-black/15 bg-white"
              }`}
            >
              {flagged[q.question_id] ? "Flagged for review" : "Flag for review"}
            </button>

            <label className="flex max-w-xs cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={answerConfirmed}
                onChange={(e) => setAnswerConfirmed(e.target.checked)}
              />
              <span>I checked my answer before going on.</span>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex <= 0}
              className="rounded-lg border-2 border-black/15 px-5 py-2.5 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="rounded-lg bg-[var(--color-dark-blue)] px-6 py-2.5 font-semibold text-white disabled:opacity-40"
            >
              {isLast ? "Finish & review" : "Next"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ExamTakePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
          <p className="text-black/60">Loading…</p>
        </main>
      }
    >
      <ExamTakeContent />
    </Suspense>
  );
}
