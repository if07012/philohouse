import type { EvaluationItem } from "./types";

export type ScoreSummaryLines = {
  objectiveLine: string;
  essayLine: string | null;
};

export function getScoreSummaryLines(
  evaluation: EvaluationItem[]
): ScoreSummaryLines {
  const nonEssay = evaluation.filter((e) => e.type !== "essay");
  const correct = nonEssay.filter((e) => e.correct === true).length;
  const total = nonEssay.length;
  const objectiveLine = `Multiple choice &amp; fill-in: <b>${correct}/${total}</b> correct`;

  const essays = evaluation.filter(
    (e) => e.type === "essay" && e.score_percent != null
  );
  let essayLine: string | null = null;
  if (essays.length > 0) {
    const sum = essays.reduce((a, e) => a + (e.score_percent ?? 0), 0);
    const avg = Math.round(sum / essays.length);
    essayLine = `Essay average: <b>${avg}%</b>`;
  }

  return { objectiveLine, essayLine };
}
