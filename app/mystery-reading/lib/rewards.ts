import type { PerQuestionResult, QuizKind } from "./types";

/** Minimum total XP to reach that level (level 1 = 0 XP). */
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= (LEVEL_THRESHOLDS[i] ?? 0)) {
      level = i + 1;
      break;
    }
  }
  return Math.min(Math.max(level, 1), 99);
}

export function computeQuizXp(params: {
  scorePercent: number;
  currentStreak: number;
}): number {
  const base = 50;
  const streakBonus = Math.min(1 + params.currentStreak * 0.05, 1.5);
  return Math.round(base * (params.scorePercent / 100) * streakBonus);
}

export type StreakUpdate = {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string;
};

export function nextStreakState(params: {
  lastCompletedDate: string;
  currentStreak: number;
  longestStreak: number;
  storyDate: string;
}): StreakUpdate {
  const last = params.lastCompletedDate.trim();
  const today = params.storyDate.trim();
  if (!last) {
    return {
      current_streak: 1,
      longest_streak: Math.max(1, params.longestStreak),
      last_completed_date: today,
    };
  }
  const dLast = new Date(last + "T12:00:00");
  const dToday = new Date(today + "T12:00:00");
  const diffDays = Math.round(
    (dToday.getTime() - dLast.getTime()) / (24 * 60 * 60 * 1000)
  );
  let next = params.currentStreak;
  if (diffDays === 0) {
    next = params.currentStreak;
  } else if (diffDays === 1) {
    next = params.currentStreak + 1;
  } else {
    next = 1;
  }
  const longest = Math.max(params.longestStreak, next);
  return {
    current_streak: next,
    longest_streak: longest,
    last_completed_date: today,
  };
}

export function mergeBadges(
  existingJson: string,
  params: {
    scorePercent: number;
    streak: number;
    level: number;
    isFirstAttempt: boolean;
  }
): string {
  let list: string[] = [];
  try {
    const parsed = JSON.parse(existingJson || "[]");
    if (Array.isArray(parsed)) list = parsed.map(String);
  } catch {
    list = [];
  }
  const set = new Set(list);
  if (params.isFirstAttempt) set.add("first_read");
  if (params.streak >= 7) set.add("streak_7");
  if (params.scorePercent >= 100) set.add("perfect_quiz");
  if (params.level >= 5) set.add("level_5");
  if (params.level >= 10) set.add("level_10");
  return JSON.stringify([...set]);
}

export function skillBreakdownFromResults(
  results: PerQuestionResult[]
): Record<QuizKind, { correct: number; total: number }> {
  const acc: Record<QuizKind, { correct: number; total: number }> = {
    fact: { correct: 0, total: 0 },
    inference: { correct: 0, total: 0 },
    logic: { correct: 0, total: 0 },
    sequence: { correct: 0, total: 0 },
    moral: { correct: 0, total: 0 },
  };
  for (const r of results) {
    acc[r.kind].total++;
    if (r.correct) acc[r.kind].correct++;
  }
  return acc;
}

export function vocabProxyPercent(breakdown: Record<QuizKind, { correct: number; total: number }>): number {
  const f = breakdown.fact;
  const s = breakdown.sequence;
  const num = f.correct + s.correct;
  const den = Math.max(1, f.total + s.total);
  return Math.round((num / den) * 1000) / 10;
}
