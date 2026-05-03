"use client";

import { type ClipboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  TranslationAttempt,
  TranslationTrainingItem,
} from "./lib/types";

type ItemsResponse =
  | {
    ok: true;
    sheetName: string;
    count: number;
    items: TranslationTrainingItem[];
  }
  | { error: string };

type AttemptsResponse = { ok: true; attempts: TranslationAttempt[] } | { error: string };
type SubmitResponse = { ok: true; attempt: TranslationAttempt } | { error: string };

type GenerateFromMaterialsResponse =
  | { ok: true; appended: number; questions: string[]; statements: string[] }
  | { error: string };

const PASS_PCT = 80;

function copyTargetAllowsClipboard(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'textarea, [contenteditable="true"], input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"])'
    )
  );
}

function blockProtectedClipboard(e: ClipboardEvent<HTMLElement>) {
  if (copyTargetAllowsClipboard(e.target)) return;
  e.preventDefault();
  e.clipboardData?.setData("text/plain", "");
}

function bySeverityDesc(a: { severity: number }, b: { severity: number }) {
  return (b.severity || 0) - (a.severity || 0);
}

function composeUnitAnswer(units: string[]): string {
  return units
    .map((v) => v.trim())
    .join(" ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default function TranslationTrainingPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TranslationTrainingItem[]>([]);
  const [attempts, setAttempts] = useState<TranslationAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [answer, setAnswer] = useState("");
  const [inputMode, setInputMode] = useState<"full" | "phrase">("full");
  const [phraseAnswers, setPhraseAnswers] = useState<string[]>([]);
  const [unitsByItem, setUnitsByItem] = useState<Record<string, string[]>>({});
  const [segmenting, setSegmenting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingFromMaterials, setGeneratingFromMaterials] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/translation-training/items", {
        cache: "no-store",
      });
      const j = (await r.json()) as ItemsResponse;
      if ("error" in j) {
        setError(j.error || "Gagal memuat data.");
        setItems([]);
      } else {
        const nextItems = Array.isArray(j.items) ? j.items : [];
        setItems(nextItems);
        setSelectedId((prev) => {
          if (prev && nextItems.some((it) => it.id === prev)) return prev;
          return nextItems[0]?.id ?? null;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/translation-training/attempts", {
          cache: "no-store",
        });
        const j = (await r.json()) as AttemptsResponse;
        if (!cancelled && !("error" in j)) {
          setAttempts(Array.isArray(j.attempts) ? j.attempts : []);
        }
      } catch {
        // Keep page usable even if progress sheet doesn't exist yet.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) || null,
    [items, selectedId]
  );

  useEffect(() => {
    const voices = window.speechSynthesis.getVoices();
    const text = selectedItem?.english || "";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.7;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [selectedItem]);

  const attemptsByItem = useMemo(() => {
    const map = new Map<string, TranslationAttempt[]>();
    for (const a of attempts) {
      const list = map.get(a.item_id) || [];
      list.push(a);
      map.set(a.item_id, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return map;
  }, [attempts]);

  const latestByItem = useMemo(() => {
    const map = new Map<string, TranslationAttempt>();
    for (const item of items) {
      const list = attemptsByItem.get(item.id) || [];
      if (list[0]) map.set(item.id, list[0]);
    }
    return map;
  }, [items, attemptsByItem]);

  const selectedAttempts = useMemo(
    () => (selectedItem ? attemptsByItem.get(selectedItem.id) || [] : []),
    [selectedItem, attemptsByItem]
  );

  const selectedWordUnits = selectedItem ? unitsByItem[selectedItem.id] || [] : [];

  const selectedLatest = selectedAttempts[0] || null;

  useEffect(() => {
    setAnswer("");
    setInputMode("full");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedItem) return;
    const cached = unitsByItem[selectedItem.id];
    if (cached && cached.length > 0) {
      setPhraseAnswers(cached.map(() => ""));
      return;
    }
    let cancelled = false;
    (async () => {
      setSegmenting(true);
      try {
        const r = await fetch("/api/translation-training/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ english: selectedItem.english }),
        });
        const j = (await r.json()) as { ok?: boolean; units?: unknown; error?: string };
        const units = Array.isArray(j.units)
          ? j.units.map((u) => String(u || "").trim()).filter(Boolean)
          : [];
        const safeUnits = units.length > 0 ? units : [selectedItem.english];
        if (!cancelled) {
          setUnitsByItem((prev) => ({ ...prev, [selectedItem.id]: safeUnits }));
          setPhraseAnswers(safeUnits.map(() => ""));
        }
      } catch {
        if (!cancelled) {
          const fallback = [selectedItem.english];
          setUnitsByItem((prev) => ({ ...prev, [selectedItem.id]: fallback }));
          setPhraseAnswers([""]);
        }
      } finally {
        if (!cancelled) setSegmenting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedItem, unitsByItem]);

  const phraseFilledCount = useMemo(
    () => phraseAnswers.filter((v) => v.trim().length > 0).length,
    [phraseAnswers]
  );
  const hasIncompletePhraseAnswer =
    inputMode === "phrase" && selectedWordUnits.length > 0 && phraseFilledCount < selectedWordUnits.length;
  const composedPhraseAnswer = useMemo(() => composeUnitAnswer(phraseAnswers), [phraseAnswers]);
  const activeAnswer = inputMode === "phrase" ? composedPhraseAnswer : answer.trim();
  const isDrafting = activeAnswer.length > 0;

  const progress = useMemo(() => {
    const done = latestByItem.size;
    const passed = [...latestByItem.values()].filter((a) => a.score_percent >= PASS_PCT).length;
    const avg =
      done > 0
        ? Math.round(
          ([...latestByItem.values()].reduce((sum, a) => sum + a.score_percent, 0) / done) * 10
        ) / 10
        : 0;
    return { done, passed, total: items.length, avg };
  }, [items.length, latestByItem]);

  async function submitOne(item: TranslationTrainingItem) {
    const studentIndonesian = activeAnswer;
    if (!studentIndonesian) return;

    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/translation-training/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          english: item.english,
          referenceIndonesian: item.indonesian_reference,
          studentIndonesian,
        }),
      });
      const j = (await r.json()) as SubmitResponse;
      if ("error" in j) {
        setError(j.error || "Gagal submit jawaban.");
        return;
      }
      setAttempts((prev) => [j.attempt, ...prev]);
      setAnswer("");
      setPhraseAnswers(selectedWordUnits.map(() => ""));
      setInputMode("full");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal submit jawaban.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateFromMaterials() {
    setGeneratingFromMaterials(true);
    setError(null);
    try {
      const r = await fetch("/api/translation-training/generate-from-materials", {
        method: "GET",
      });
      const j = (await r.json()) as GenerateFromMaterialsResponse;
      if ("error" in j || !r.ok) {
        setError(("error" in j && j.error) || "Gagal generate dari List Material.");
        return;
      }
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate dari List Material.");
    } finally {
      setGeneratingFromMaterials(false);
    }
  }

  return (
    <div
      className="pt-6 px-4 max-w-3xl mx-auto text-[#1f3f43] select-none"
      onCopy={blockProtectedClipboard}
      onCut={blockProtectedClipboard}
    >
      <header className="mb-8">
        <p className="text-[#35858E] text-xs font-semibold uppercase tracking-widest mb-2">
          Translation Training
        </p>
        <h1 className="text-2xl font-bold text-[#35858E] leading-tight">
          Latihan terjemahan Inggris → Indonesia
        </h1>
        <p className="mt-2 text-[#4d6f63] text-sm">
          Pilih teks dari daftar latihan, lalu kerjakan di section terjemahan. Semua hasil dan
          koreksi disimpan untuk dipantau sebagai progress.
        </p>
        <div className="mt-4">
          {false && <button
            type="button"
            onClick={() => void handleGenerateFromMaterials()}
            disabled={generatingFromMaterials || loading}
            className="inline-flex justify-center rounded-xl border border-[#35858E] bg-[#35858E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2f767d] disabled:opacity-50"
          >
            {generatingFromMaterials
              ? "Men-generate…"
              : "Generate"}
          </button>
          }
          <p className="mt-2 text-xs text-[#5d816f] max-w-xl">
            Membaca sheet <span className="font-semibold text-[#35858E]">List Material</span> (kolom{" "}
            <span className="font-semibold">Material</span>), lalu AI menulis 5 pertanyaan dan 5
            pernyataan bahasa Inggris yang relevan dengan tema materi, dan menyimpannya ke{" "}
            <span className="font-semibold text-[#35858E]">Translation-EN-ID</span> kolom{" "}
            <span className="font-semibold">english</span>.
          </p>
        </div>
      </header>

      {error ? (
        <div className="mb-6 rounded-2xl border border-[#35858E]/40 bg-[#C2D099]/50 p-4 text-sm text-[#204a4f]">
          {error}
        </div>
      ) : null}

      <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-[#7DA78C]/60 bg-[#E6EEC9] p-3">
          <p className="text-[11px] text-[#5d816f] uppercase">Total latihan</p>
          <p className="text-xl font-bold text-[#2f6b71]">{progress.total}</p>
        </div>
        <div className="rounded-xl border border-[#7DA78C]/60 bg-[#E6EEC9] p-3">
          <p className="text-[11px] text-[#5d816f] uppercase">Sudah dikerjakan</p>
          <p className="text-xl font-bold text-[#2f6b71]">{progress.done}</p>
        </div>
        <div className="rounded-xl border border-[#7DA78C]/60 bg-[#E6EEC9] p-3">
          <p className="text-[11px] text-[#5d816f] uppercase">Lulus (&gt;={PASS_PCT}%)</p>
          <p className="text-xl font-bold text-[#2f6b71]">{progress.passed}</p>
        </div>
        <div className="rounded-xl border border-[#7DA78C]/60 bg-[#E6EEC9] p-3">
          <p className="text-[11px] text-[#5d816f] uppercase">Rata-rata skor</p>
          <p className="text-xl font-bold text-[#2f6b71]">{progress.avg}%</p>
        </div>
      </section>

      {loading ? (
        <p className="text-center text-[#4d6f63] text-sm">Memuat data dari Google Sheet…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#7DA78C]/50 bg-[#E6EEC9] p-5 text-[#45685d] text-sm">
          Tidak ada data.
          <div className="mt-2 text-xs text-[#5d816f]">
            Pastikan sheet <code className="text-[#35858E]">Translation-EN-ID</code> punya kolom{" "}
            <code className="text-[#35858E]">english</code> dan (opsional){" "}
            <code className="text-[#35858E]">indonesian</code>.
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_1.4fr]">
          <section className="rounded-2xl border border-[#7DA78C]/50 bg-[#E6EEC9] p-4 h-fit">
            <h2 className="text-sm font-semibold text-[#4d6f63] uppercase tracking-wide mb-3">
              List latihan
            </h2>
            <ul className="space-y-2">
              {items.map((it, idx) => {
                const latest = latestByItem.get(it.id);
                const active = it.id === selectedId;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(it.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${active
                        ? "border-[#35858E] bg-[#C2D099]/55"
                        : "border-[#7DA78C]/40 bg-[#f4f7e8] hover:bg-[#C2D099]/30"
                        }`}
                    >
                      <p className="text-xs text-[#5d816f]">Latihan {idx + 1}</p>
                      <p className="text-sm text-[#1f3f43] line-clamp-2">{it.english}</p>
                      {latest ? (
                        <p className="mt-1 text-xs text-[#2f6b71]">Skor terakhir: {latest.score_percent}%</p>
                      ) : (
                        <p className="mt-1 text-xs text-[#5d816f]">Belum dikerjakan</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#7DA78C]/50 bg-[#E6EEC9] p-5">
            {!selectedItem ? (
              <p className="text-sm text-[#4d6f63]">Pilih latihan dari daftar di kiri.</p>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-[#4d6f63] uppercase tracking-wide">
                  Section terjemahan
                </h2>
                <p className="mt-2 text-xs text-[#5d816f]">English text</p>
                <p className="text-[#1f3f43] font-semibold">{selectedItem.english}</p>

                <div className="mt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInputMode("full")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${inputMode === "full"
                        ? "bg-[#35858E] border-[#35858E] text-white"
                        : "bg-[#f4f7e8] border-[#7DA78C]/60 text-[#2f6b71]"
                        }`}
                    >
                      Mode kalimat penuh
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("phrase")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${inputMode === "phrase"
                        ? "bg-[#35858E] border-[#35858E] text-white"
                        : "bg-[#f4f7e8] border-[#7DA78C]/60 text-[#2f6b71]"
                        }`}
                    >
                      Mode per kata (AI)
                    </button>
                  </div>

                  <label className="block text-xs text-[#5d816f] mb-1">
                    Terjemahan Bahasa Indonesia
                  </label>
                  {inputMode === "full" ? (
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-[#7DA78C] bg-[#f4f7e8] px-3 py-2 text-[#1f3f43] placeholder:text-[#7DA78C] focus:outline-none focus:ring-2 focus:ring-[#35858E]/50 select-text"
                      placeholder="Tulis terjemahanmu di sini…"
                    />
                  ) : (
                    <div className="space-y-2">
                      {segmenting && selectedWordUnits.length === 0 ? (
                        <p className="text-xs text-[#5d816f]">AI sedang memecah unit kata...</p>
                      ) : null}
                      {selectedWordUnits.map((unit, idx) => (
                        <div
                          key={`unit_${idx}`}
                          className="rounded-xl border border-[#7DA78C]/45 bg-[#f4f7e8] p-3"
                        >
                          <p className="text-xs text-[#5d816f]">Unit kata {idx + 1}</p>
                          <p className="text-sm text-[#1f3f43] font-medium">{unit}</p>
                          <input
                            value={phraseAnswers[idx] || ""}
                            onChange={(e) =>
                              setPhraseAnswers((prev) => {
                                const next = [...prev];
                                next[idx] = e.target.value;
                                return next;
                              })
                            }
                            className="mt-2 w-full rounded-lg border border-[#7DA78C] bg-white px-3 py-2 text-sm text-[#1f3f43] placeholder:text-[#7DA78C] focus:outline-none focus:ring-2 focus:ring-[#35858E]/50 select-text"
                            placeholder="Arti unit kata ini dalam Bahasa Indonesia..."
                          />
                        </div>
                      ))}
                      <p className="text-xs text-[#5d816f]">
                        Hasil gabungan untuk dinilai:{" "}
                        <span className="font-semibold text-[#2f6b71]">
                          {composedPhraseAnswer || "-"}
                        </span>
                      </p>
                      {hasIncompletePhraseAnswer ? (
                        <p className="text-xs text-[#8a6d3b]">
                          Isi semua unit kata dulu agar bisa submit sebagai satu kalimat utuh.
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void submitOne(selectedItem)}
                      disabled={submitting || !activeAnswer || hasIncompletePhraseAnswer}
                      className="inline-flex justify-center rounded-xl bg-[#35858E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2f767d] disabled:opacity-50"
                    >
                      {submitting ? "Menyimpan..." : "Submit & simpan hasil"}
                    </button>
                    <span className="text-xs text-[#5d816f]">
                      Hasil tersimpan dan bisa dicek lagi kapan saja.
                    </span>
                  </div>
                </div>

                {selectedLatest && !isDrafting ? (
                  <div className="mt-5 rounded-xl border border-[#7DA78C]/55 bg-[#C2D099]/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#2f6b71]">Koreksi terakhir</p>
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border bg-[#7DA78C]/30 text-[#1f4f54] border-[#35858E]/30">
                        {selectedLatest.score_percent}%
                      </span>
                    </div>
                    <p className="text-sm text-[#4d6f63] mt-1">{selectedLatest.overall_feedback}</p>
                    {selectedLatest.issues.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm">
                        {selectedLatest.issues.slice().sort(bySeverityDesc).map((x, idx) => (
                          <li key={`latest_issue_${idx}`} className="rounded-xl bg-[#E6EEC9] p-3">
                            <div className="text-[#1f3f43]">
                              <span className="text-[#5d816f] text-xs uppercase tracking-wide">
                                Salah di
                              </span>{" "}
                              <span className="font-semibold">{x.source_phrase || "(umum)"}</span>
                            </div>
                            <div className="mt-1 text-[#2f5559]">
                              <span className="text-[#5d816f]">Kamu:</span> {x.student_phrase || "-"}
                            </div>
                            <div className="mt-1 text-[#2f6b71]">
                              <span className="text-[#5d816f]">Saran:</span> {x.suggestion || "-"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-[#4d6f63] uppercase tracking-wide">
                    Riwayat latihan item ini
                  </h3>
                  {selectedAttempts.length === 0 ? (
                    <p className="text-xs text-[#5d816f] mt-2">Belum ada riwayat.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {selectedAttempts.map((a) => (
                        <li
                          key={a.attempt_id}
                          className="rounded-xl border border-[#7DA78C]/50 bg-[#f4f7e8] p-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs text-[#5d816f]">
                              {new Date(a.created_at).toLocaleString("id-ID")}
                            </p>
                            <p className="text-sm font-semibold text-[#2f6b71]">{a.score_percent}%</p>
                          </div>
                          <p className="text-xs text-[#5d816f] mt-1">Jawaban siswa</p>
                          <p className="text-sm text-[#1f3f43]">{a.student_indonesian}</p>
                          <p className="text-xs text-[#4d6f63] mt-1">{a.overall_feedback}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

