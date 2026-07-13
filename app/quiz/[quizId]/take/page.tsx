"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnswerOption, QuestionCard } from "../../components/QuizQuestion";
import { QuizTimer } from "../../components/QuizTimer";
import {
  getOrCreateUserId,
  getUserName,
  loadQuizState,
  reorderQuestions,
  saveQuizState,
  shuffleArray,
} from "../../lib/sessionStorage";
import type { PublicQuestion, QuizRow } from "../../lib/types";

function QuizTakeContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quiz/session/${encodeURIComponent(quizId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat soal");

        if (cancelled) return;

        const stored = loadQuizState(quizId);
        if (stored?.submitted) {
          router.replace(`/quiz/${quizId}/result`);
          return;
        }

        if (!stored || stored.expiresAt <= Date.now()) {
          router.replace(`/quiz/${quizId}`);
          return;
        }

        const rawQuestions: PublicQuestion[] = json.questions || [];
        let orderedQuestions = reorderQuestions(rawQuestions, stored.questionOrder);
        console.log("orderedQuestions", orderedQuestions, "RawQuestions", rawQuestions, "stored.questionOrder", stored.questionOrder);
        const questionOrder = shuffleArray(rawQuestions.map((q) => q.id));
        saveQuizState({
          ...stored,
          questionOrder,
        });
        orderedQuestions = reorderQuestions(rawQuestions, questionOrder);

        setQuiz(json.quiz);
        setQuestions(orderedQuestions);
        setAnswers(stored.answers);
        setCurrentIndex(stored.currentIndex);
        setExpiresAt(stored.expiresAt);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal memuat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId, router]);

  const persist = useCallback(
    (patch: Partial<{ answers: Record<string, string>; currentIndex: number }>) => {
      const stored = loadQuizState(quizId);
      if (!stored) return;
      saveQuizState({
        ...stored,
        answers: patch.answers ?? stored.answers,
        currentIndex: patch.currentIndex ?? stored.currentIndex,
      });
    },
    [quizId]
  );

  const submitQuiz = useCallback(
    async (status: "completed" | "timeout") => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);

      const stored = loadQuizState(quizId);
      if (!stored) return;

      try {
        const res = await fetch("/api/quiz/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quizId,
            attemptId: stored.attemptId,
            userId: getOrCreateUserId(),
            userName: getUserName(),
            answers: stored.answers,
            startTime: stored.startTime,
            finishTime: new Date().toISOString(),
            status,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal submit");

        saveQuizState({
          ...stored,
          submitted: true,
          status,
          results: json,
        });
        router.replace(`/quiz/${quizId}/result`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal submit quiz");
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [quizId, router]
  );

  const handleTimeout = useCallback(() => {
    void submitQuiz("timeout");
  }, [submitQuiz]);

  const total = questions.length;
  const q = questions[currentIndex];
  const isLast = currentIndex >= total - 1;
  const progress = useMemo(() => {
    if (total === 0) return 0;
    return Math.round(((currentIndex + 1) / total) * 100);
  }, [currentIndex, total]);

  const selectAnswer = (letter: string) => {
    if (!q || submitting) return;
    const next = { ...answers, [q.id]: letter };
    setAnswers(next);
    persist({ answers: next });
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    const nextIdx = currentIndex - 1;
    setCurrentIndex(nextIdx);
    persist({ currentIndex: nextIdx });
  };

  const goNext = () => {
    if (currentIndex >= total - 1) return;
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    persist({ currentIndex: nextIdx });
  };

  const finish = () => {
    void submitQuiz("completed");
  };

  if (loading) {
    return <p className="text-black/60">Memuat quiz…</p>;
  }

  if (error || !q || !quiz) {
    return (
      <div>
        <p className="text-red-700">{error || "Tidak ada soal."}</p>
        <Link href="/quiz" className="mt-4 inline-block text-[var(--color-accent)]">
          Kembali
        </Link>
      </div>
    );
  }

  const selected = answers[q.id] ?? "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-dark-blue)]">
            {quiz.title}
          </h2>
          <p className="text-sm text-black/55">
            Question {currentIndex + 1} of {total}
          </p>
        </div>
        {expiresAt > 0 && (
          <QuizTimer expiresAt={expiresAt} onTimeout={handleTimeout} />
        )}
      </div>

      <div className="progress-bar mb-6" role="progressbar" aria-valuenow={progress}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <section className="card-quiz p-6">
        <QuestionCard
          type={q.type}
          question={q.question}
          imageUrl={q.imageUrl}
          orderIndex={q.orderIndex}
          total={total}
        />

        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Pilihan jawaban">
          {q.answers.map((a) => (
            <AnswerOption
              key={a.id}
              answer={a}
              selected={selected === a.letter}
              onSelect={() => selectAnswer(a.letter)}
              disabled={submitting}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-black/10 pt-6">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex <= 0 || submitting}
            className="rounded-lg border-2 border-black/15 px-5 py-2.5 font-medium disabled:opacity-40"
          >
            Previous
          </button>
          {!isLast && (
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="rounded-lg border-2 border-black/15 px-5 py-2.5 font-medium disabled:opacity-40"
            >
              Next
            </button>
          )}
          <button
            type="button"
            onClick={finish}
            disabled={submitting}
            className="rounded-lg bg-[var(--color-dark-blue)] px-6 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Mengirim…" : "Finish"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function QuizTakePage() {
  return (
    <Suspense fallback={<p className="text-black/60">Memuat…</p>}>
      <QuizTakeContent />
    </Suspense>
  );
}
