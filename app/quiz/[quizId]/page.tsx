"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  beginQuizAttempt,
  getUserName,
  isQuizInProgress,
  loadQuizState,
} from "../lib/sessionStorage";
import type { QuizRow } from "../lib/types";

function QuizStartContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = params.quizId as string;
  const retake = searchParams.get("retake") === "1";

  const [quiz, setQuiz] = useState<(QuizRow & { questionCount: number }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quiz/quiz/${encodeURIComponent(quizId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Quiz tidak ditemukan");
        if (cancelled) return;
        setQuiz(json.quiz);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal memuat quiz");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    if (!quiz || !retake) return;
    beginQuizAttempt(quizId, quiz.duration);
    router.replace(`/quiz/${quizId}/take`);
  }, [quiz, quizId, retake, router]);

  const startQuiz = () => {
    if (!quiz) return;

    const stored = loadQuizState(quizId);
    if (isQuizInProgress(stored)) {
      router.push(`/quiz/${quizId}/take`);
      return;
    }

    beginQuizAttempt(quizId, quiz.duration);
    router.push(`/quiz/${quizId}/take`);
  };

  if (loading) {
    return <p className="text-black/60">Memuat…</p>;
  }

  if (error || !quiz) {
    return (
      <div>
        <p className="text-red-700">{error || "Quiz tidak ditemukan"}</p>
        <Link href="/quiz" className="mt-4 inline-block text-[var(--color-accent)]">
          Kembali
        </Link>
      </div>
    );
  }

  if (retake) {
    return <p className="text-black/60">Menyiapkan quiz…</p>;
  }

  const stored = typeof window !== "undefined" ? loadQuizState(quizId) : null;
  const inProgress = isQuizInProgress(stored);
  const hasPreviousResult = Boolean(stored?.submitted && stored.results);

  return (
    <div className="card-quiz max-w-xl p-6">
      <h2 className="text-2xl font-bold text-[var(--color-dark-blue)]">{quiz.title}</h2>
      {quiz.description && (
        <p className="mt-3 text-black/70">{quiz.description}</p>
      )}

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between border-b border-black/5 pb-2">
          <dt className="text-black/55">Jumlah soal</dt>
          <dd className="font-semibold">{quiz.questionCount}</dd>
        </div>
        <div className="flex justify-between border-b border-black/5 pb-2">
          <dt className="text-black/55">Durasi</dt>
          <dd className="font-semibold">{quiz.duration} menit</dd>
        </div>
        <div className="flex justify-between border-b border-black/5 pb-2">
          <dt className="text-black/55">Passing score</dt>
          <dd className="font-semibold">{quiz.passingScore}</dd>
        </div>
        <div className="flex justify-between pb-2">
          <dt className="text-black/55">Peserta</dt>
          <dd className="font-semibold">{getUserName() || "Anonim"}</dd>
        </div>
      </dl>

      {inProgress && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Anda memiliki sesi quiz yang belum selesai. Klik lanjutkan untuk melanjutkan.
        </p>
      )}

      {hasPreviousResult && !inProgress && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Anda sudah pernah mengerjakan quiz ini. Klik ulangi untuk memulai percobaan baru.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startQuiz}
          className="rounded-lg bg-[var(--color-dark-blue)] px-6 py-3 font-semibold text-white"
        >
          {inProgress ? "Lanjutkan Quiz" : hasPreviousResult ? "Ulangi Quiz" : "Start Quiz"}
        </button>
        {hasPreviousResult && (
          <Link
            href={`/quiz/${quizId}/result`}
            className="inline-flex items-center rounded-lg border-2 border-black/15 px-5 py-3 font-medium"
          >
            Lihat Hasil Terakhir
          </Link>
        )}
        <Link
          href="/quiz"
          className="inline-flex items-center rounded-lg border-2 border-black/15 px-5 py-3 font-medium"
        >
          Kembali
        </Link>
      </div>
    </div>
  );
}

export default function QuizStartPage() {
  return (
    <Suspense fallback={<p className="text-black/60">Memuat…</p>}>
      <QuizStartContent />
    </Suspense>
  );
}
