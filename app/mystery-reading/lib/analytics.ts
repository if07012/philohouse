import type { QuizKind } from "./types";

export type ChildAnalytics = {
  childId: string;
  nickname: string;
  readingDays: number;
  attemptCount: number;
  avgScore: number;
  inferencePct: number;
  logicPct: number;
  vocabProxyPct: number;
  lastCompleted: string | null;
};

function pct(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 1000) / 10;
}

export function aggregateAttemptsForChild(params: {
  childId: string;
  nickname: string;
  attemptRows: Record<string, string>[];
}): ChildAnalytics {
  const rows = params.attemptRows;
  const uniqueDays = new Set<string>();
  let scoreSum = 0;
  let infC = 0,
    infT = 0,
    logC = 0,
    logT = 0,
    factC = 0,
    factT = 0,
    seqC = 0,
    seqT = 0;
  let lastCompleted: string | null = null;

  for (const r of rows) {
    const d = String(r.story_date || "").trim();
    if (d) uniqueDays.add(d);
    const sp = Number(r.score_percent);
    if (Number.isFinite(sp)) scoreSum += sp;
    const completed = String(r.completed_at || "").trim();
    if (completed && (!lastCompleted || completed > lastCompleted)) {
      lastCompleted = completed;
    }
    try {
      const per = JSON.parse(r.per_question_results_json || "[]") as {
        kind: QuizKind;
        correct: boolean;
      }[];
      if (Array.isArray(per)) {
        for (const p of per) {
          if (p.kind === "inference") {
            infT++;
            if (p.correct) infC++;
          }
          if (p.kind === "logic") {
            logT++;
            if (p.correct) logC++;
          }
          if (p.kind === "fact") {
            factT++;
            if (p.correct) factC++;
          }
          if (p.kind === "sequence") {
            seqT++;
            if (p.correct) seqC++;
          }
        }
      }
    } catch {
      /* skip malformed */
    }
  }

  const n = rows.length;
  const vocabProxyPct = pct(factC + seqC, factT + seqT);

  return {
    childId: params.childId,
    nickname: params.nickname,
    readingDays: uniqueDays.size,
    attemptCount: n,
    avgScore: n ? Math.round((scoreSum / n) * 10) / 10 : 0,
    inferencePct: pct(infC, infT),
    logicPct: pct(logC, logT),
    vocabProxyPct,
    lastCompleted,
  };
}
