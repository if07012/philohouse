"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ContentType, QuizRow } from "../../lib/types";

type QuestionWithAnswers = {
  id: string;
  quizId: string;
  orderIndex: number;
  type: ContentType;
  question: string;
  imageUrl: string;
  score: number;
  answers: {
    id: string;
    letter: string;
    type: ContentType;
    text: string;
    imageUrl: string;
    isCorrect: boolean;
  }[];
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function questionPreview(q: QuestionWithAnswers): string {
  if (q.question.trim()) {
    const text = q.question.trim().replace(/\s+/g, " ");
    return text.length > 72 ? `${text.slice(0, 72)}…` : text;
  }
  if (q.imageUrl.trim()) return "(gambar)";
  return "(belum diisi)";
}

function correctAnswerLetter(q: QuestionWithAnswers): string {
  return q.answers.find((a) => a.isCorrect)?.letter ?? "—";
}

export default function QuizAdminEditPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  
  // Copy feature states
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [targetQuizzes, setTargetQuizzes] = useState<{ id: string; title: string }[]>([]);
  const [targetQuizId, setTargetQuizId] = useState<string>("");
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copying, setCopying] = useState(false);
  const [allQuizzesLoading, setAllQuizzesLoading] = useState(false);

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    duration: 30,
    passingScore: 70,
    active: true,
  });

  const [newQuestion, setNewQuestion] = useState({
    type: "text" as ContentType,
    question: "",
    imageUrl: "",
    score: 5,
  });

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [quizRes, qRes] = await Promise.all([
        fetch(`/api/quiz/quiz/${encodeURIComponent(quizId)}`, { credentials: "include" }),
        fetch(
          `/api/quiz/question?quizId=${encodeURIComponent(quizId)}&includeAnswerKey=1`,
          { credentials: "include" }
        ),
      ]);
      const quizJson = await quizRes.json();
      const qJson = await qRes.json();
      if (!quizRes.ok) throw new Error(quizJson.error || "Quiz tidak ditemukan");
      if (!qRes.ok) throw new Error(qJson.error || "Gagal memuat soal");
      setQuiz(quizJson.quiz);
      setQuizForm({
        title: quizJson.quiz.title,
        description: quizJson.quiz.description,
        duration: quizJson.quiz.duration,
        passingScore: quizJson.quiz.passingScore,
        active: quizJson.quiz.active,
      });
      setQuestions(qJson.questions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      if (opts?.silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  // Load all quizzes for copy target dropdown
  const loadAllQuizzes = useCallback(async () => {
    setAllQuizzesLoading(true);
    try {
      const res = await fetch("/api/quiz/quiz", { credentials: "include" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.quizzes)) {
        setTargetQuizzes(json.quizzes.filter((q: { id: string }) => q.id !== quizId));
      }
    } catch (e) {
      console.error("Failed to load quizzes:", e);
    } finally {
      setAllQuizzesLoading(false);
    }
  }, [quizId]);

  const toggleQuestionSelection = (qid: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) {
        next.delete(qid);
      } else {
        next.add(qid);
      }
      return next;
    });
  };

  const selectAllQuestions = () => {
    setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestionIds(new Set());
  };

  const openCopyModal = async () => {
    if (selectedQuestionIds.size === 0) {
      alert("Pilih minimal satu soal untuk disalin.");
      return;
    }
    await loadAllQuizzes();
    setShowCopyModal(true);
  };

  const copyQuestionsToTarget = async () => {
    if (!targetQuizId) {
      alert("Pilih quiz tujuan.");
      return;
    }
    setCopying(true);
    try {
      const res = await fetch("/api/quiz/question/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sourceQuizId: quizId,
          targetQuizId,
          questionIds: Array.from(selectedQuestionIds),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyalin soal");
      alert(`${json.copied || selectedQuestionIds.size} soal berhasil disalin ke ${json.targetQuizTitle || "quiz tujuan"}.`);
      setShowCopyModal(false);
      setTargetQuizId("");
      setSelectedQuestionIds(new Set());
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyalin soal");
    } finally {
      setCopying(false);
    }
  };

  const buildQuestionPayload = (q: QuestionWithAnswers) => ({
    type: q.type,
    question: q.question,
    imageUrl: q.imageUrl,
    score: q.score,
    orderIndex: q.orderIndex,
    answers: q.answers.map((a) => ({
      id: a.id || undefined,
      letter: a.letter,
      type: a.type,
      text: a.text,
      imageUrl: a.imageUrl,
      isCorrect: a.isCorrect,
    })),
  });

  const saveQuestionToApi = async (q: QuestionWithAnswers) => {
    const res = await fetch(`/api/quiz/question/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(buildQuestionPayload(q)),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `Gagal menyimpan soal #${q.orderIndex}`);
    }
    return json;
  };

  const saveAll = async () => {
    setSavingAll(true);
    setNotice(null);
    try {
      const quizRes = await fetch(`/api/quiz/quiz/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(quizForm),
      });
      const quizJson = await quizRes.json();
      if (!quizRes.ok) throw new Error(quizJson.error || "Gagal menyimpan quiz");

      const questionResults = await Promise.all(questions.map((q) => saveQuestionToApi(q)));

      setQuestions((prev) =>
        prev.map((q) => {
          const idx = questions.findIndex((item) => item.id === q.id);
          const answers = questionResults[idx]?.answers;
          return Array.isArray(answers) ? { ...q, answers } : q;
        })
      );

      setNotice(
        questions.length
          ? `Quiz dan ${questions.length} soal berhasil disimpan.`
          : "Quiz berhasil disimpan."
      );
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSavingAll(false);
    }
  };

  const saveQuizMeta = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/quiz/quiz/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(quizForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      setNotice("Quiz berhasil disimpan.");
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = (file: File | null) => {
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImportJson(String(reader.result ?? ""));
    };
    reader.onerror = () => setImportError("Gagal membaca file.");
    reader.readAsText(file);
  };

  const importQuestions = async () => {
    setImportError(null);
    setNotice(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson.trim());
    } catch {
      setImportError("JSON tidak valid. Periksa format file.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/quiz/question/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quizId, questions: parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengimpor soal");

      setImportJson("");
      setNotice(`${json.imported} soal berhasil diimpor.`);
      await load({ silent: true });
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Gagal mengimpor soal");
    } finally {
      setImporting(false);
    }
  };

  const addQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setAddingQuestion(true);
    setNotice(null);
    try {
      const res = await fetch("/api/quiz/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...newQuestion, quizId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambah soal");

      setNewQuestion({ type: "text", question: "", imageUrl: "", score: 5 });
      setNotice("Soal berhasil ditambahkan.");
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menambah soal");
    } finally {
      setAddingQuestion(false);
    }
  };

  const saveQuestion = async (q: QuestionWithAnswers) => {
    setSavingQuestionId(q.id);
    setNotice(null);
    try {
      const json = await saveQuestionToApi(q);

      if (Array.isArray(json.answers)) {
        setQuestions((prev) =>
          prev.map((item) =>
            item.id === q.id ? { ...item, answers: json.answers } : item
          )
        );
      }
      setNotice(`Soal #${q.orderIndex} berhasil disimpan.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan soal");
    } finally {
      setSavingQuestionId(null);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Hapus soal ini?")) return;
    const res = await fetch(`/api/quiz/question/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const updateQuestionLocal = (
    qid: string,
    patch: Partial<QuestionWithAnswers>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qid ? { ...q, ...patch } : q))
    );
  };

  const updateAnswerLocal = (
    qid: string,
    aid: string | null,
    letter: string,
    patch: Partial<QuestionWithAnswers["answers"][0]>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const answers = q.answers.map((a) => {
          if (aid && a.id === aid) return { ...a, ...patch };
          if (!aid && a.letter === letter) return { ...a, ...patch };
          if (patch.isCorrect) return { ...a, isCorrect: false };
          return a;
        });
        if (patch.isCorrect) {
          return {
            ...q,
            answers: answers.map((a) =>
              (aid ? a.id === aid : a.letter === letter)
                ? { ...a, isCorrect: true }
                : { ...a, isCorrect: false }
            ),
          };
        }
        return { ...q, answers };
      })
    );
  };

  const addAnswerOption = (qid: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid || q.answers.length >= 6) return q;
        const used = new Set(q.answers.map((a) => a.letter));
        const nextLetter = LETTERS.find((l) => !used.has(l));
        if (!nextLetter) return q;
        return {
          ...q,
          answers: [
            ...q.answers,
            {
              id: "",
              letter: nextLetter,
              type: "text" as ContentType,
              text: "",
              imageUrl: "",
              isCorrect: false,
            },
          ],
        };
      })
    );
  };

  if (loading) return <p className="text-black/60">Memuat…</p>;
  if (error || !quiz) {
    return (
      <div>
        <p className="text-red-700">{error || "Quiz tidak ditemukan"}</p>
        <Link href="/quiz/admin" className="mt-4 inline-block text-[var(--color-accent)]">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/quiz/admin" className="text-sm text-[var(--color-accent)] hover:underline">
        ← Admin
      </Link>
      <h2 className="mt-2 text-xl font-bold text-[var(--color-dark-blue)]">
        Edit: {quiz.title}
      </h2>

      {notice && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {refreshing && (
        <p className="mt-2 text-sm text-black/50">Memperbarui data…</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveAll}
          disabled={savingAll || saving || savingQuestionId !== null}
          className="rounded-lg bg-[var(--color-dark-blue)] px-5 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {savingAll ? "Menyimpan semua…" : "Simpan Semua"}
        </button>
        <p className="text-sm text-black/50">
          Simpan judul quiz, pengaturan, dan semua soal sekaligus.
        </p>
      </div>

      {/* Copy Questions Toolbar */}
      <div className="card-quiz mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllQuestions}
              disabled={questions.length === 0}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={deselectAllQuestions}
              disabled={selectedQuestionIds.size === 0}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Batal Pilih
            </button>
            <span className="text-sm text-black/60">
              Terpilih: <strong>{selectedQuestionIds.size}</strong> dari {questions.length} soal
            </span>
          </div>
          <button
            type="button"
            onClick={openCopyModal}
            disabled={selectedQuestionIds.size === 0}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            Salin Soal Terpilih
          </button>
        </div>
      </div>

      <form onSubmit={saveQuizMeta} className="card-quiz mt-4 grid gap-3 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Judul</label>
          <input
            value={quizForm.title}
            onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Deskripsi</label>
          <textarea
            value={quizForm.description}
            onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Durasi (menit)</label>
          <input
            type="number"
            value={quizForm.duration}
            onChange={(e) => setQuizForm({ ...quizForm, duration: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Passing Score</label>
          <input
            type="number"
            value={quizForm.passingScore}
            onChange={(e) =>
              setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })
            }
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={quizForm.active}
            onChange={(e) => setQuizForm({ ...quizForm, active: e.target.checked })}
          />
          <span className="text-sm">Aktif (publish)</span>
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving || savingAll}
            className="rounded-lg border border-black/15 px-5 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Quiz Saja"}
          </button>
        </div>
      </form>

      <div className="card-quiz mt-8 space-y-3 p-5">
        <h3 className="font-semibold">Import dari JSON</h3>
        <p className="text-sm text-black/55">
          Unggah atau tempel JSON berisi array soal. Format mengikuti struktur soal dengan
          field <code className="text-xs">orderIndex</code>, <code className="text-xs">type</code>,{" "}
          <code className="text-xs">question</code>, <code className="text-xs">imageUrl</code>,{" "}
          <code className="text-xs">score</code>, dan <code className="text-xs">answers</code>.
          Jawaban pertama (A) otomatis ditandai benar jika tidak ada{" "}
          <code className="text-xs">isCorrect</code>.
        </p>
        <div>
          <label className="text-sm font-medium">File JSON</label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Atau tempel JSON</label>
          <textarea
            value={importJson}
            onChange={(e) => {
              setImportJson(e.target.value);
              setImportError(null);
            }}
            rows={6}
            placeholder='[{"orderIndex":1,"type":"text","question":"...","imageUrl":"","score":5,"answers":[...]}]'
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 font-mono text-xs"
          />
        </div>
        {importError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{importError}</p>
        )}
        <button
          type="button"
          onClick={importQuestions}
          disabled={importing || !importJson.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {importing ? "Mengimpor…" : "Import Soal"}
        </button>
      </div>

      <form onSubmit={addQuestion} className="card-quiz mt-8 space-y-3 p-5">
        <h3 className="font-semibold">Tambah Soal</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm">Tipe</label>
            <select
              value={newQuestion.type}
              onChange={(e) =>
                setNewQuestion({
                  ...newQuestion,
                  type: e.target.value as ContentType,
                })
              }
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Poin per benar</label>
            <input
              type="number"
              value={newQuestion.score}
              onChange={(e) =>
                setNewQuestion({ ...newQuestion, score: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm">Pertanyaan (teks)</label>
          <textarea
            value={newQuestion.question}
            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm">URL Gambar</label>
          <input
            value={newQuestion.imageUrl}
            onChange={(e) => setNewQuestion({ ...newQuestion, imageUrl: e.target.value })}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={addingQuestion}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {addingQuestion ? "Menambahkan…" : "+ Tambah Soal"}
        </button>
      </form>

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-[var(--color-dark-blue)]">
            Daftar Soal ({questions.length})
          </h3>
          <p className="text-sm text-black/50">Klik baris soal untuk membuka/menutup.</p>
        </div>

        {questions.map((q) => (
          <details key={q.id} className="quiz-accordion card-quiz">
            <summary className="quiz-accordion-summary">
              <input
                type="checkbox"
                checked={selectedQuestionIds.has(q.id)}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleQuestionSelection(q.id);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleQuestionSelection(q.id);
                }}
                className="mr-3 h-4 w-4 accent-[var(--color-dark-blue)]"
              />
              <span className="quiz-accordion-chevron" aria-hidden="true">
                ▶
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold text-[var(--color-dark-blue)]">
                    Soal #{q.orderIndex}
                  </span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60">
                    {q.type}
                  </span>
                  <span className="text-xs text-black/50">{q.score} poin</span>
                  <span className="text-xs text-black/50">
                    Jawaban benar: {correctAnswerLetter(q)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-black/55">{questionPreview(q)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteQuestion(q.id);
                }}
                className="shrink-0 text-sm text-red-600 hover:underline"
              >
                Hapus
              </button>
            </summary>

            <div className="quiz-accordion-body">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-black/55">Tipe</label>
                  <select
                    value={q.type}
                    onChange={(e) =>
                      updateQuestionLocal(q.id, { type: e.target.value as ContentType })
                    }
                    className="mt-1 w-full rounded border border-black/15 px-2 py-1.5 text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-black/55">Poin</label>
                  <input
                    type="number"
                    value={q.score}
                    onChange={(e) =>
                      updateQuestionLocal(q.id, { score: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded border border-black/15 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <textarea
                value={q.question}
                onChange={(e) => updateQuestionLocal(q.id, { question: e.target.value })}
                rows={2}
                placeholder="Teks pertanyaan"
                className="mt-2 w-full rounded border border-black/15 px-2 py-1.5 text-sm"
              />
              <input
                value={q.imageUrl}
                onChange={(e) => updateQuestionLocal(q.id, { imageUrl: e.target.value })}
                placeholder="URL gambar"
                className="mt-2 w-full rounded border border-black/15 px-2 py-1.5 text-sm"
              />

              <p className="mt-4 text-sm font-semibold">Jawaban (2–6 pilihan)</p>
              <div className="mt-2 space-y-3">
                {q.answers.map((a) => (
                  <div
                    key={a.id || a.letter}
                    className="rounded-lg border border-black/10 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold">{a.letter}</span>
                      <select
                        value={a.type}
                        onChange={(e) =>
                          updateAnswerLocal(q.id, a.id, a.letter, {
                            type: e.target.value as ContentType,
                          })
                        }
                        className="rounded border border-black/15 px-2 py-1 text-xs"
                      >
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="mixed">Mixed</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={a.isCorrect}
                          onChange={() =>
                            updateAnswerLocal(q.id, a.id, a.letter, { isCorrect: true })
                          }
                        />
                        Benar
                      </label>
                    </div>
                    <input
                      value={a.text}
                      onChange={(e) =>
                        updateAnswerLocal(q.id, a.id, a.letter, { text: e.target.value })
                      }
                      placeholder="Teks jawaban"
                      className="mt-2 w-full rounded border border-black/15 px-2 py-1 text-sm"
                    />
                    <input
                      value={a.imageUrl}
                      onChange={(e) =>
                        updateAnswerLocal(q.id, a.id, a.letter, {
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="URL gambar jawaban"
                      className="mt-1 w-full rounded border border-black/15 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>

              {q.answers.length < 6 && (
                <button
                  type="button"
                  onClick={() => addAnswerOption(q.id)}
                  className="mt-2 text-sm text-[var(--color-accent)]"
                >
                  + Tambah pilihan
                </button>
              )}

              <button
                type="button"
                onClick={() => saveQuestion(q)}
                disabled={savingQuestionId === q.id || savingAll}
                className="mt-4 rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {savingQuestionId === q.id ? "Menyimpan…" : "Simpan Soal Ini"}
              </button>
            </div>
          </details>
        ))}
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--color-dark-blue)]">
              Salin Soal ke Quiz Lain
            </h3>
            <p className="mt-1 text-sm text-black/60">
              {selectedQuestionIds.size} soal akan disalin
            </p>
            
            <div className="mt-4">
              <label className="text-sm font-medium">Pilih Quiz Tujuan</label>
              {allQuizzesLoading ? (
                <p className="mt-2 text-sm text-black/50">Memuat daftar quiz...</p>
              ) : targetQuizzes.length === 0 ? (
                <p className="mt-2 text-sm text-red-600">
                  Tidak ada quiz lain untuk tujuan penyalinan.
                </p>
              ) : (
                <select
                  value={targetQuizId}
                  onChange={(e) => setTargetQuizId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2"
                >
                  <option value="">-- Pilih Quiz --</option>
                  {targetQuizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCopyModal(false);
                  setTargetQuizId("");
                }}
                disabled={copying}
                className="rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={copyQuestionsToTarget}
                disabled={copying || !targetQuizId || allQuizzesLoading || targetQuizzes.length === 0}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {copying ? "Menyalin..." : "Salin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
