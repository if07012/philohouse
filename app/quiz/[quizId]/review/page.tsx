"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AnswerOption,
  formatAnswerLabel,
  QuestionCard,
} from "../../components/QuizQuestion";
import { loadQuizState, reorderQuestions } from "../../lib/sessionStorage";
import type { PublicQuestion, SubmitResult } from "../../lib/types";

type ExplainState = {
  loading: boolean;
  text?: string;
  error?: string;
};

export default function QuizReviewPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, ExplainState>>(
    {}
  );

  useEffect(() => {
    const stored = loadQuizState(quizId);
    if (stored?.results) setResult(stored.results);

    (async () => {
      try {
        const stored = loadQuizState(quizId);
        const attemptQuery = stored?.attemptId
          ? `?attemptId=${encodeURIComponent(stored.attemptId)}`
          : "";
        const res = await fetch(
          `/api/quiz/session/${encodeURIComponent(quizId)}${attemptQuery}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat review");
        const rawQuestions: PublicQuestion[] = json.questions || [];
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

  async function fetchExplanation(
    question: PublicQuestion,
    userAnswer: PublicQuestion["answers"][0] | undefined,
    correctAnswer: PublicQuestion["answers"][0] | undefined,
    userDisplayLetter: string,
    correctDisplayLetter: string
  ) {
    const questionId = question.id;
    setExplanations((prev) => ({
      ...prev,
      [questionId]: { loading: true },
    }));

    try {
      const res = await fetch("/api/quiz/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          imageUrl: question.imageUrl,
          answers: question.answers.map((a) => ({
            letter: a.letter,
            text: a.text,
          })),
          userAnswer: userAnswer
            ? formatAnswerLabel(userAnswer, userDisplayLetter)
            : "Tidak dijawab",
          correctAnswer: formatAnswerLabel(correctAnswer, correctDisplayLetter),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat penjelasan");

      setExplanations((prev) => ({
        ...prev,
        [questionId]: { loading: false, text: json.explanation },
      }));
    } catch (e) {
      setExplanations((prev) => ({
        ...prev,
        [questionId]: {
          loading: false,
          error: e instanceof Error ? e.message : "Gagal memuat penjelasan",
        },
      }));
    }
  }

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
          const userAnswer = q.answers.find(
            (a) => a.id === scored?.selectedAnswerId
          );
          const correctAnswer = q.answers.find(
            (a) => a.id === scored?.correctAnswerId
          );
          const userDisplayLetter = userAnswer?.letter ?? userLetter;
          const correctDisplayLetter = correctAnswer?.letter ?? correctLetter;
          const isCorrect = scored?.correct ?? false;
          const explainState = explanations[q.id];

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
                    {userDisplayLetter
                      ? formatAnswerLabel(userAnswer, userDisplayLetter)
                      : "Tidak dijawab"}
                  </p>
                </div>
                <div className="rounded-lg bg-black/[0.04] px-4 py-3 text-sm">
                  <p className="font-semibold text-black/70">Jawaban Benar</p>
                  <p className="mt-1">
                    {formatAnswerLabel(correctAnswer, correctDisplayLetter)}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${isCorrect ? "text-emerald-700" : "text-red-700"
                    }`}
                >
                  {isCorrect ? "✔ Correct" : "✖ Wrong"}
                </p>

                {!isCorrect && (
                  <div className="pt-1">
                    {!explainState?.text && !explainState?.loading && (
                      <button
                        type="button"
                        onClick={() =>
                          fetchExplanation(
                            q,
                            userAnswer,
                            correctAnswer,
                            userDisplayLetter,
                            correctDisplayLetter
                          )
                        }
                        className="rounded-lg border-2 border-[var(--color-accent)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-dark-blue)] transition hover:bg-[var(--color-soft)]/40"
                      >
                        Explain
                      </button>
                    )}

                    {explainState?.loading && (
                      <p className="text-sm text-black/60">Memuat penjelasan…</p>
                    )}

                    {explainState?.error && (
                      <div className="space-y-2">
                        <p className="text-sm text-red-700">{explainState.error}</p>
                        <button
                          type="button"
                          onClick={() =>
                            fetchExplanation(
                              q,
                              userAnswer,
                              correctAnswer,
                              userDisplayLetter,
                              correctDisplayLetter
                            )
                          }
                          className="text-sm font-semibold text-[var(--color-accent)]"
                        >
                          Coba lagi
                        </button>
                      </div>
                    )}

                    {explainState?.text && (
                      <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-soft)]/30 px-4 py-3 text-sm">
                        <p className="font-semibold text-[var(--color-dark-blue)]">
                          Penjelasan
                        </p>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {explainState.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2 opacity-80">
                {q.answers.map((a) => (
                  <AnswerOption
                    key={a.id}
                    answer={a}
                    selected={a.id === scored?.selectedAnswerId}
                    onSelect={() => { }}
                    disabled
                    showResult
                    isCorrect={a.id === scored?.correctAnswerId}
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
