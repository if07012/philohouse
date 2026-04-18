'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type SurahOption = {
  id: number;
  name: string;
  totalAyah: number;
};

type MemorizedItem = {
  id: string;
  surahId: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  createdAt: string;
};

const SURAH_OPTIONS: SurahOption[] = [
  { id: 1, name: 'Al-Fatihah', totalAyah: 7 },
  { id: 2, name: 'Al-Baqarah', totalAyah: 286 },
  { id: 3, name: 'Ali Imran', totalAyah: 200 },
  { id: 18, name: 'Al-Kahf', totalAyah: 110 },
  { id: 36, name: 'Yasin', totalAyah: 83 },
  { id: 55, name: 'Ar-Rahman', totalAyah: 78 },
  { id: 67, name: 'Al-Mulk', totalAyah: 30 },
  { id: 78, name: 'An-Naba', totalAyah: 40 },
  { id: 79, name: "An-Nazi'at", totalAyah: 46 },
  { id: 80, name: 'Abasa', totalAyah: 42 },
  { id: 81, name: 'At-Takwir', totalAyah: 29 },
  { id: 82, name: 'Al-Infitar', totalAyah: 19 },
  { id: 83, name: 'Al-Mutaffifin', totalAyah: 36 },
  { id: 84, name: 'Al-Inshiqaq', totalAyah: 25 },
  { id: 85, name: 'Al-Buruj', totalAyah: 22 },
  { id: 86, name: 'At-Tariq', totalAyah: 17 },
  { id: 87, name: "Al-A'la", totalAyah: 19 },
  { id: 88, name: 'Al-Ghashiyah', totalAyah: 26 },
  { id: 89, name: 'Al-Fajr', totalAyah: 30 },
  { id: 90, name: 'Al-Balad', totalAyah: 20 },
  { id: 91, name: 'Ash-Shams', totalAyah: 15 },
  { id: 92, name: 'Al-Layl', totalAyah: 21 },
  { id: 93, name: 'Ad-Duhaa', totalAyah: 11 },
  { id: 94, name: 'Ash-Sharh', totalAyah: 8 },
  { id: 95, name: 'At-Tin', totalAyah: 8 },
  { id: 96, name: 'Al-Alaq', totalAyah: 19 },
  { id: 97, name: 'Al-Qadr', totalAyah: 5 },
  { id: 98, name: 'Al-Bayyinah', totalAyah: 8 },
  { id: 99, name: 'Az-Zalzalah', totalAyah: 8 },
  { id: 100, name: 'Al-Adiyat', totalAyah: 11 },
  { id: 101, name: "Al-Qari'ah", totalAyah: 11 },
  { id: 102, name: 'At-Takathur', totalAyah: 8 },
  { id: 103, name: 'Al-Asr', totalAyah: 3 },
  { id: 104, name: 'Al-Humazah', totalAyah: 9 },
  { id: 105, name: 'Al-Fil', totalAyah: 5 },
  { id: 106, name: 'Quraysh', totalAyah: 4 },
  { id: 107, name: "Al-Ma'un", totalAyah: 7 },
  { id: 108, name: 'Al-Kawthar', totalAyah: 3 },
  { id: 109, name: 'Al-Kafirun', totalAyah: 6 },
  { id: 110, name: 'An-Nasr', totalAyah: 3 },
  { id: 111, name: 'Al-Masad', totalAyah: 5 },
  { id: 112, name: 'Al-Ikhlas', totalAyah: 4 },
  { id: 113, name: 'Al-Falaq', totalAyah: 5 },
  { id: 114, name: 'An-Nas', totalAyah: 6 },
];
const STORAGE_KEY = 'remember-ayah-items-v1';
const AYAH_CACHE_STORAGE_KEY = 'remember-ayah-api-cache-v1';
const AYAH_API_BASE_URL = 'https://api.alquran.cloud/v1/ayah';
/** Global ayah index (1–6236) for Mishary Alafasy audio on cdn.islamic.network */
const QURAN_AUDIO_ALAFASY_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';
const ayahMemoryCache = new Map<string, AyahApiData>();

function getAlafasyAudioUrl(globalAyahNumber: number) {
  return `${QURAN_AUDIO_ALAFASY_BASE}/${globalAyahNumber}.mp3`;
}

type AyahApiData = {
  number: number;
  numberInSurah: number;
  text: string;
  surah: {
    number: number;
    englishName: string;
  };
};

type AyahCacheRecord = Record<string, AyahApiData>;

export default function RememberPage() {
  const [selectedSurahId, setSelectedSurahId] = useState<number>(SURAH_OPTIONS[0].id);
  const [selectedStartAyah, setSelectedStartAyah] = useState<number>(1);
  const [selectedEndAyah, setSelectedEndAyah] = useState<number>(1);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isSendingResult, setIsSendingResult] = useState(false);
  const [hasSentTelegramResult, setHasSentTelegramResult] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    Array<{
      id: string;
      surahId: number;
      surahName: string;
      ayah: number;
      /** Global ayah number from API (matches audio filename, e.g. 262 → 262.mp3) */
      questionGlobalNumber: number;
      questionText: string;
      options: Array<{ surahId: number; ayah: number; text: string }>;
      correctOptionKey: string;
      selectedOptionKey?: string;
      isRevealed?: boolean;
      ruleType: 'next' | 'previous';
    }>
  >([]);
  const [items, setItems] = useState<MemorizedItem[]>(() => {
    if (typeof window === 'undefined') return [];

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as Array<
        MemorizedItem & { ayah?: number; startAyah?: number; endAyah?: number }
      >;

      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item) => {
          const mappedStart = item.startAyah ?? item.ayah;
          const mappedEnd = item.endAyah ?? item.ayah;
          if (!mappedStart || !mappedEnd) return null;

          return {
            id: item.id,
            surahId: item.surahId,
            surahName: item.surahName,
            startAyah: mappedStart,
            endAyah: mappedEnd,
            createdAt: item.createdAt,
          };
        })
        .filter((item): item is MemorizedItem => item !== null);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });
  const hasSentTelegramResultRef = useRef(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

  const selectedSurah = useMemo(
    () => SURAH_OPTIONS.find((item) => item.id === selectedSurahId) ?? SURAH_OPTIONS[0],
    [selectedSurahId]
  );

  const ayahOptions = useMemo(
    () => Array.from({ length: selectedSurah.totalAyah }, (_, idx) => idx + 1),
    [selectedSurah.totalAyah]
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    hasSentTelegramResultRef.current = hasSentTelegramResult;
  }, [hasSentTelegramResult]);

  const activeQuestion =
    generatedQuestions.length > 0 ? generatedQuestions[currentQuestionIndex] : null;

  const activeQuestionRef = useRef(activeQuestion);
  activeQuestionRef.current = activeQuestion;

  /** Only the question id — stable when user selects an answer on the same screen */
  const activeQuestionIdForAudio = activeQuestion?.id ?? null;

  useEffect(() => {
    const stopCurrent = () => {
      const current = questionAudioRef.current;
      if (current) {
        current.pause();
        current.src = '';
        questionAudioRef.current = null;
      }
    };

    const q = activeQuestionRef.current;
    if (!activeQuestionIdForAudio || !q || q.id !== activeQuestionIdForAudio) {
      stopCurrent();
      return;
    }

    stopCurrent();

    const url = getAlafasyAudioUrl(q.questionGlobalNumber);
    const audio = new Audio(url);
    questionAudioRef.current = audio;
    void audio.play().catch(() => {
      /* autoplay may be blocked until user gesture; Replay still works */
    });

    return () => {
      audio.pause();
      audio.src = '';
      if (questionAudioRef.current === audio) {
        questionAudioRef.current = null;
      }
    };
  }, [activeQuestionIdForAudio]);

  function replayQuestionAudio() {
    const audio = questionAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }

  async function playAyahAudioByKey(optionKey: string) {
    const [surahPart, ayahPart] = optionKey.split(':');
    const surahId = Number(surahPart);
    const ayah = Number(ayahPart);
    if (!surahId || !ayah) return;

    try {
      const ayahData = await fetchAyahByReference(`${surahId}:${ayah}`);
      const current = questionAudioRef.current;
      if (current) {
        current.pause();
        current.src = '';
      }

      const audio = new Audio(getAlafasyAudioUrl(ayahData.number));
      questionAudioRef.current = audio;
      void audio.play().catch(() => {});
    } catch {
      // Ignore audio fallback failures silently.
    }
  }

  function resetForm() {
    setSelectedStartAyah(1);
    setSelectedEndAyah(1);
  }

  function addMemorizedAyahRange() {
    const startAyah = Math.min(selectedStartAyah, selectedEndAyah);
    const endAyah = Math.max(selectedStartAyah, selectedEndAyah);
    const exists = items.some(
      (item) =>
        item.surahId === selectedSurah.id &&
        item.startAyah === startAyah &&
        item.endAyah === endAyah
    );

    if (exists) return;

    const newItem: MemorizedItem = {
      id: `${selectedSurah.id}:${startAyah}-${endAyah}`,
      surahId: selectedSurah.id,
      surahName: selectedSurah.name,
      startAyah,
      endAyah,
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);
    resetForm();
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function fetchAyahByReference(reference: string) {
    const cachedInMemory = ayahMemoryCache.get(reference);
    if (cachedInMemory) {
      return cachedInMemory;
    }

    if (typeof window !== 'undefined') {
      const rawCache = window.localStorage.getItem(AYAH_CACHE_STORAGE_KEY);
      if (rawCache) {
        try {
          const parsedCache = JSON.parse(rawCache) as AyahCacheRecord;
          const cachedFromStorage = parsedCache[reference];
          if (cachedFromStorage) {
            ayahMemoryCache.set(reference, cachedFromStorage);
            return cachedFromStorage;
          }
        } catch {
          window.localStorage.removeItem(AYAH_CACHE_STORAGE_KEY);
        }
      }
    }

    const response = await fetch(`${AYAH_API_BASE_URL}/${reference}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ayah reference: ${reference}`);
    }

    const body = (await response.json()) as { data?: AyahApiData };
    if (!body.data) {
      throw new Error(`Invalid ayah response for reference: ${reference}`);
    }

    ayahMemoryCache.set(reference, body.data);

    if (typeof window !== 'undefined') {
      try {
        const rawCache = window.localStorage.getItem(AYAH_CACHE_STORAGE_KEY);
        const parsedCache = rawCache ? (JSON.parse(rawCache) as AyahCacheRecord) : {};
        parsedCache[reference] = body.data;
        window.localStorage.setItem(AYAH_CACHE_STORAGE_KEY, JSON.stringify(parsedCache));
      } catch {
        window.localStorage.removeItem(AYAH_CACHE_STORAGE_KEY);
      }
    }

    return body.data;
  }

  async function generateQuestions() {
    if (items.length === 0 || questionCount < 1) {
      setGeneratedQuestions([]);
      setCurrentQuestionIndex(0);
      setGenerationError(null);
      return;
    }

    setIsGeneratingQuestions(true);
    setGenerationError(null);
    setTelegramError(null);
    setHasSentTelegramResult(false);

    const pool = items.flatMap((item) =>
      Array.from({ length: item.endAyah - item.startAyah + 1 }, (_, index) => ({
        surahId: item.surahId,
        surahName: item.surahName,
        ayah: item.startAyah + index,
      }))
    );

    const uniquePool = pool.filter(
      (entry, idx, arr) =>
        arr.findIndex(
          (x) => x.surahId === entry.surahId && x.surahName === entry.surahName && x.ayah === entry.ayah
        ) === idx
    );

    if (uniquePool.length === 0) {
      setGeneratedQuestions([]);
      setCurrentQuestionIndex(0);
      setIsGeneratingQuestions(false);
      return;
    }

    try {
      const shuffledPool = [...uniquePool];
      for (let i = shuffledPool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
      }

      const questionList = await Promise.all(
        Array.from({ length: questionCount }, async (_, index) => {
          // Ensure every ayah in the selected ranges is used once before repeating.
          const questionBase = shuffledPool[index % shuffledPool.length];
          const questionApi = await fetchAyahByReference(
            `${questionBase.surahId}:${questionBase.ayah}`
          );

          const surah = SURAH_OPTIONS.find((item) => item.id === questionBase.surahId);
          const isLastAyahInSurah =
            questionApi.numberInSurah >= (surah?.totalAyah ?? questionApi.numberInSurah);
          const ruleType: 'next' | 'previous' = isLastAyahInSurah ? 'previous' : 'next';
          const expectedGlobalAyah = isLastAyahInSurah
            ? Math.max(1, questionApi.number - 1)
            : questionApi.number + 1;
          const correctApi = await fetchAyahByReference(String(expectedGlobalAyah));
          const correctOptionKey = `${correctApi.surah.number}:${correctApi.numberInSurah}`;

          const distractorCandidates = uniquePool.filter(
            (entry) =>
              !(
                entry.surahId === correctApi.surah.number &&
                entry.ayah === correctApi.numberInSurah
              )
          );

          const distractors: Array<{ surahId: number; ayah: number }> = [];
          while (distractors.length < 3 && distractorCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * distractorCandidates.length);
            const picked = distractorCandidates[randomIndex];
            distractors.push({ surahId: picked.surahId, ayah: picked.ayah });
            distractorCandidates.splice(randomIndex, 1);
          }

          while (distractors.length < 3) {
            const randomFallback = uniquePool[Math.floor(Math.random() * uniquePool.length)];
            const fallbackKey = `${randomFallback.surahId}:${randomFallback.ayah}`;
            if (fallbackKey !== correctOptionKey || uniquePool.length === 1) {
              distractors.push({ surahId: randomFallback.surahId, ayah: randomFallback.ayah });
            }
          }

          const optionBase: Array<{ surahId: number; ayah: number; text: string }> = [
            {
              surahId: correctApi.surah.number,
              ayah: correctApi.numberInSurah,
              text: correctApi.text.trim(),
            },
            ...distractors.map((d) => ({
              surahId: d.surahId,
              ayah: d.ayah,
              text: '',
            })),
          ];

          for (let i = 1; i < optionBase.length; i += 1) {
            const optionAyah = await fetchAyahByReference(`${optionBase[i].surahId}:${optionBase[i].ayah}`);
            optionBase[i] = {
              surahId: optionBase[i].surahId,
              ayah: optionBase[i].ayah,
              text: optionAyah.text.trim(),
            };
          }

          for (let i = optionBase.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionBase[i], optionBase[j]] = [optionBase[j], optionBase[i]];
          }

          return {
            id: `q-${Date.now()}-${index}`,
            surahId: questionBase.surahId,
            surahName: questionBase.surahName,
            ayah: questionBase.ayah,
            questionGlobalNumber: questionApi.number,
            questionText: questionApi.text.trim(),
            options: optionBase,
            correctOptionKey,
            ruleType,
          };
        })
      );

      setGeneratedQuestions(questionList);
      setCurrentQuestionIndex(0);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate questions from API.'
      );
      setGeneratedQuestions([]);
      setCurrentQuestionIndex(0);
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  function selectAnswer(questionId: string, optionKey: string) {
    setGeneratedQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, selectedOptionKey: optionKey } : question
      )
    );
  }

  function buildResultSummary(questions: typeof generatedQuestions) {
    const total = questions.length;
    const correct = questions.filter((q) => q.selectedOptionKey === q.correctOptionKey).length;
    const failed = total - correct;
    return { total, correct, failed };
  }

  function buildSelectedRangesText() {
    if (items.length === 0) return '';
    const lines = items.map((item) => {
      if (item.startAyah === item.endAyah) return `- ${item.surahName}: ${item.startAyah}`;
      return `- ${item.surahName}: ${item.startAyah}–${item.endAyah}`;
    });
    return ['','<b>Selected ranges</b>', ...lines].join('\n');
  }

  function buildFailedAyahsText(questions: typeof generatedQuestions) {
    const failedQuestions = questions.filter(
      (question) => question.selectedOptionKey !== question.correctOptionKey
    );
    if (failedQuestions.length === 0) return '';

    const lines = failedQuestions.map(
      (question) => `- ${question.surahName}: ${question.ayah}`
    );
    return ['', '<b>Failed ayahs</b>', ...lines].join('\n');
  }

  async function sendResultToTelegram(questions: typeof generatedQuestions) {
    if (hasSentTelegramResultRef.current) return;

    const result = buildResultSummary(questions);
    const message = [
      '<b>Remember Ayah Quiz Result</b>',
      '',
      `Total Question: <b>${result.total}</b>`,
      `Correct: <b>${result.correct}</b>`,
      `Failed: <b>${result.failed}</b>`,
      buildSelectedRangesText(),
      buildFailedAyahsText(questions),
    ].join('\n');

    setIsSendingResult(true);
    setTelegramError(null);
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to send result to Telegram.');
      }

      setHasSentTelegramResult(true);
      hasSentTelegramResultRef.current = true;
    } catch (error) {
      setTelegramError(error instanceof Error ? error.message : 'Failed to send Telegram result.');
    } finally {
      setIsSendingResult(false);
    }
  }

  function revealAnswer(
    questionId: string,
    isFinalQuestion: boolean,
    selectedOptionKey?: string,
    correctOptionKey?: string
  ) {
    setGeneratedQuestions((prev) => {
      const next = prev.map((question) =>
        question.id === questionId ? { ...question, isRevealed: true } : question
      );
      if (isFinalQuestion && !hasSentTelegramResultRef.current) {
        void sendResultToTelegram(next);
      }
      return next;
    });

    if (
      selectedOptionKey &&
      correctOptionKey &&
      selectedOptionKey !== correctOptionKey
    ) {
      void playAyahAudioByKey(correctOptionKey);
    }
  }

  const totalMemorized = items.length;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion =
    generatedQuestions.length === 0 || currentQuestionIndex === generatedQuestions.length - 1;

  return (
    <main className="min-h-screen bg-[#f8f5ef] px-4 py-8 md:px-8">
      <section className="mx-auto w-full max-w-4xl space-y-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2e4f4f] md:text-3xl">
            Remember Specific Ayah
          </h1>
          <p className="text-sm text-gray-600 md:text-base">
            Pick surah and ayah, then save your memorization progress.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Surah</span>
            <select
              value={selectedSurahId}
              onChange={(event) => {
                setSelectedSurahId(Number(event.target.value));
                setSelectedStartAyah(1);
                setSelectedEndAyah(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#4a8c88]"
            >
              {SURAH_OPTIONS.map((surah) => (
                <option key={surah.id} value={surah.id}>
                  {surah.id}. {surah.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Start Ayah</span>
            <select
              value={selectedStartAyah}
              onChange={(event) => setSelectedStartAyah(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#4a8c88]"
            >
              {ayahOptions.map((ayah) => (
                <option key={ayah} value={ayah}>
                  Ayah {ayah}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">End Ayah</span>
            <select
              value={selectedEndAyah}
              onChange={(event) => setSelectedEndAyah(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#4a8c88]"
            >
              {ayahOptions.map((ayah) => (
                <option key={ayah} value={ayah}>
                  Ayah {ayah}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">
              Number of questions to generate
            </span>
            <input
              type="number"
              min={1}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#4a8c88]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addMemorizedAyahRange}
            className="rounded-lg bg-[#4a8c88] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3f7a76]"
          >
            Save Ayah
          </button>
          <button
            type="button"
            onClick={generateQuestions}
            disabled={isGeneratingQuestions}
            className="rounded-lg border border-[#4a8c88] px-5 py-2 text-sm font-semibold text-[#2e4f4f] hover:bg-[#eef6f5]"
          >
            {isGeneratingQuestions ? 'Generating...' : 'Generate Questions'}
          </button>
          <p className="text-sm text-gray-600">
            Total saved ayah: <strong>{totalMemorized}</strong>
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#2e4f4f]">Saved Ayahs</h2>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              No ayah saved yet. Start with one ayah today.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-gray-800">
                      {item.surahName} - Ayah {item.startAyah}
                      {item.endAyah !== item.startAyah ? ` to ${item.endAyah}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="self-start rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#2e4f4f]">Generated Questions</h2>
          {generatedQuestions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              Click Generate Questions to create quiz ayahs from your saved ranges.
            </p>
          ) : (
            <div className="space-y-4 text-sm text-gray-700">
              {activeQuestion ? (
                <div key={activeQuestion.id} className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Question {currentQuestionIndex + 1} of {generatedQuestions.length}
                  </p>
                  <p className="mb-3 font-semibold text-gray-800">
                    {activeQuestion.ruleType === 'previous'
                      ? 'Choose the answer text: previous ayah'
                      : 'Choose the answer text: next ayah'}
                  </p>

                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={replayQuestionAudio}
                      className="rounded-md border border-[#4a8c88] px-3 py-1 text-xs font-medium text-[#2e4f4f] hover:bg-[#eef6f5]"
                    >
                      Replay audio
                    </button>
                  </div>

                  <div className="mb-4 rounded-md border border-gray-200 p-2">
                    <p
                      dir="rtl"
                      className="font-quran-hafs text-center text-3xl leading-[2.35] whitespace-pre-line font-semibold tracking-normal text-gray-900 sm:text-4xl"
                    >
                      {activeQuestion.questionText}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {activeQuestion.options.map((option) => {
                      const optionKey = `${option.surahId}:${option.ayah}`;
                      const isSelected = activeQuestion.selectedOptionKey === optionKey;
                      const isCorrect = activeQuestion.correctOptionKey === optionKey;
                      const showCorrect = activeQuestion.isRevealed === true && isCorrect;
                      const showWrong =
                        activeQuestion.isRevealed === true && isSelected && !isCorrect;

                      return (
                        <button
                          key={`${activeQuestion.id}-${optionKey}`}
                          type="button"
                          onClick={() => selectAnswer(activeQuestion.id, optionKey)}
                          disabled={activeQuestion.isRevealed === true}
                          className={`rounded-md border p-2 text-left transition ${
                            showCorrect
                              ? 'border-green-500 bg-green-50'
                              : showWrong
                                ? 'border-red-500 bg-red-50'
                                : isSelected
                                  ? 'border-[#4a8c88] bg-[#eef6f5]'
                                  : 'border-gray-200 hover:border-[#4a8c88]'
                          } disabled:cursor-not-allowed disabled:opacity-90`}
                        >
                          <p
                            dir="rtl"
                            className="font-quran-hafs text-center text-2xl leading-[2.25] whitespace-pre-line font-medium tracking-normal text-gray-900 sm:text-3xl"
                          >
                            {option.text}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {activeQuestion.isRevealed === true ? (
                    <p className="mt-3 text-xs text-gray-600">
                      Correct answer is highlighted in green.
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={isFirstQuestion}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        (() => {
                          if (!activeQuestion.isRevealed) {
                            revealAnswer(
                              activeQuestion.id,
                              isLastQuestion,
                              activeQuestion.selectedOptionKey,
                              activeQuestion.correctOptionKey
                            );
                            return;
                          }
                          setCurrentQuestionIndex((prev) =>
                            Math.min(generatedQuestions.length - 1, prev + 1)
                          );
                        })()
                      }
                      disabled={isLastQuestion && activeQuestion.isRevealed === true}
                      className="rounded-md bg-[#4a8c88] px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {activeQuestion.isRevealed ? 'Next' : 'Reveal'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {generationError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {generationError}
            </p>
          ) : null}
          {telegramError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              {telegramError}
            </p>
          ) : null}
          {isSendingResult ? (
            <p className="text-xs text-gray-500">Sending result to Telegram...</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
