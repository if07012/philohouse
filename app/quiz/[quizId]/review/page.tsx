"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AnswerOption,
  formatAnswerLabel,
  QuestionCard,
} from "../../components/QuizQuestion";
import { loadQuizState, reorderQuestions } from "../../lib/sessionStorage";
import type { PublicQuestion, SubmitResult } from "../../lib/types";

export default function QuizReviewPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadQuizState(quizId);
    if (stored?.results) setResult(stored.results);

    (async () => {
      try {
        const res = await fetch(`/api/quiz/session/${encodeURIComponent(quizId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat review");
        const rawQuestions: PublicQuestion[] = json.questions || [];
        const stored = loadQuizState(quizId);
        setQuestions(reorderQuestions(rawQuestions, stored?.questionOrder));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const scoredByQuestion = useMemo(() => {
    const m = new Map<string, SubmitResult["answers"][0]>();
    for (const a of result?.answers ?? []) m.set(a.questionId, a);
    return m;
  }, [result]);

  if (loading) {
    return <p className="text-black/60">Memuat review…</p>;
  }

  if (error) {
    return (
      <div>
        <p className="text-red-700">{error}</p>
        <Link href={`/quiz/${quizId}/result`} className="mt-4 inline-block text-[var(--color-accent)]">
          Kembali ke hasil
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--color-dark-blue)]">Review Jawaban</h2>
      <p className="mt-1 text-sm text-black/60">
        Lihat jawaban Anda dan jawaban yang benar untuk setiap soal.
      </p>

      <ol className="mt-8 space-y-8">
        {questions.map((q) => {
          const scored = scoredByQuestion.get(q.id);
          const userLetter = scored?.selectedLetter ?? "";
          const correctLetter = scored?.correctLetter ?? "";
          const userAnswer = q.answers.find((a) => a.letter === userLetter);
          const correctAnswer = q.answers.find((a) => a.letter === correctLetter);
          const isCorrect = scored?.correct ?? false;

          return (
            <li key={q.id} className="card-quiz p-5">
              <QuestionCard
                type={q.type}
                question={q.question}
                imageUrl={q.imageUrl}
                orderIndex={q.orderIndex}
                total={questions.length}
              />

              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-black/[0.04] px-4 py-3 text-sm">
                  <p className="font-semibold text-black/70">Jawaban Anda</p>
                  <p className="mt-1">
                    {userLetter ? formatAnswerLabel(userAnswer, userLetter) : "Tidak dijawab"}
                  </p>
                </div>
                <div className="rounded-lg bg-black/[0.04] px-4 py-3 text-sm">
                  <p className="font-semibold text-black/70">Jawaban Benar</p>
                  <p className="mt-1">
                    {formatAnswerLabel(correctAnswer, correctLetter)}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    isCorrect ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {isCorrect ? "✔ Correct" : "✖ Wrong"}
                </p>
              </div>

              <div className="mt-4 space-y-2 opacity-80">
                {q.answers.map((a) => (
                  <AnswerOption
                    key={a.id}
                    answer={a}
                    selected={userLetter === a.letter}
                    onSelect={() => {}}
                    disabled
                    showResult
                    isCorrect={a.letter === correctLetter}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-10">
        <Link
          href={`/quiz/${quizId}/result`}
          className="rounded-lg bg-[var(--color-dark-blue)] px-5 py-2.5 font-semibold text-white"
        >
          Kembali ke Hasil
        </Link>
      </div>
    </div>
  );
}
