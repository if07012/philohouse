import { sendTelegramHtmlMessage } from "@/app/lib/telegramSend";
import { getScoreSummaryLines } from "./examScoreSummary";
import type { EvaluationItem, ExamQuestionType } from "./types";

function escapeTelegramHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getPublicAppBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL;
  if (u?.trim()) return u.trim().replace(/\/$/, "");
  const v = process.env.VERCEL_URL;
  if (v?.trim()) {
    const host = v.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "";
}

/** Escape a URL for use inside double-quoted HTML attributes (Telegram HTML). */
function escapeHref(url: string): string {
  return url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Notify configured Telegram chats that an exam was submitted, with scores and results URL.
 */
export async function notifyExamSubmissionTelegram(params: {
  examId: string;
  materialTitle: string;
  submissionId: string;
  evaluation: EvaluationItem[];
}): Promise<void> {
  const base = getPublicAppBaseUrl();
  const sid = encodeURIComponent(params.submissionId);
  const resultsPath = `/examination/${params.examId}/results?sid=${sid}`;
  const resultsUrl = base ? `${base}${resultsPath}` : "";

  const { objectiveLine, essayLine } = getScoreSummaryLines(params.evaluation);
  const title = escapeTelegramHtml(params.materialTitle || "Exam");
  const shortId = escapeTelegramHtml(params.submissionId.slice(0, 8));

  const lines = [
    `<b>Grade 4 examination submitted</b>`,
    ``,
    `📚 <i>${title}</i>`,
    ``,
    `✅ ${objectiveLine}`,
  ];
  if (essayLine) {
    lines.push(`📝 ${essayLine}`);
  }
  lines.push(``, `🆔 <code>${shortId}…</code>`);
  if (resultsUrl) {
    lines.push(``, `<a href="${escapeHref(resultsUrl)}">View full report</a>`);
    lines.push(``, `<code>${escapeTelegramHtml(resultsUrl)}</code>`);
  } else {
    lines.push(
      ``,
      `<i>Add NEXT_PUBLIC_APP_URL or APP_BASE_URL for a clickable results link.</i>`
    );
  }

  const result = await sendTelegramHtmlMessage(lines.join("\n"));
  if (!result.success && result.error !== "Telegram not configured") {
    console.warn("Exam Telegram notify:", result.error);
  }
}

function truncTelegramField(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function parseOptionsFromJson(optionsJson: string): string[] {
  try {
    const p = JSON.parse(optionsJson || "[]");
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

function letterToOptionIndex(letter: string): number {
  const L = letter.trim().toUpperCase();
  if (L.length !== 1 || L < "A" || L > "D") return -1;
  return L.charCodeAt(0) - "A".charCodeAt(0);
}

/**
 * For Telegram: show MCQ letters with the actual option text (A–D → options_json index 0–3).
 */
export function formatStudentAnswerForTelegram(params: {
  questionType: ExamQuestionType;
  studentAnswer: string;
  optionsJson: string;
}): string {
  const raw = params.studentAnswer.trim();
  const options = parseOptionsFromJson(params.optionsJson);
  if (options.length === 0) return raw;

  if (params.questionType === "mcq_single") {
    const L = raw.toUpperCase().slice(0, 1);
    const idx = letterToOptionIndex(L);
    if (idx < 0 || idx >= options.length) return raw;
    return `${L}: ${options[idx]}`;
  }

  if (params.questionType === "mcq_multi") {
    const letters = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (letters.length === 0) return raw;
    const parts = letters.map((L) => {
      const idx = letterToOptionIndex(L);
      if (idx < 0 || idx >= options.length) return L;
      return `${L}: ${options[idx]}`;
    });
    return parts.join("\n");
  }

  return raw;
}

/**
 * When unset or not "false"/"0", sends a Telegram message on each /check-answer call (progress).
 * Set TELEGRAM_EXAM_CHECK_ANSWER_NOTIFY=false to disable only these pings (submission notify unchanged).
 */
export function isExamCheckAnswerTelegramEnabled(): boolean {
  const v = (process.env.TELEGRAM_EXAM_CHECK_ANSWER_NOTIFY ?? "").trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return true;
}

/**
 * Notify admin of each answer check while a student takes an exam (live progress).
 * Does not include the correct answer or solution text.
 */
export async function notifyExamCheckAnswerTelegram(params: {
  examId: string;
  materialId: string;
  materialTitle: string;
  questionId: string;
  orderIndex: string;
  questionType: ExamQuestionType;
  questionText: string;
  studentAnswer: string;
  optionsJson: string;
  correct: boolean;
}): Promise<void> {
  if (!isExamCheckAnswerTelegramEnabled()) return;

  const title = escapeTelegramHtml(truncTelegramField(params.materialTitle || "—", 160));
  const examShort = escapeTelegramHtml(params.examId.slice(0, 8));
  const qidShort = escapeTelegramHtml(params.questionId.slice(0, 8));
  const midShort = escapeTelegramHtml(params.materialId.slice(0, 12));
  const qText = escapeTelegramHtml(truncTelegramField(params.questionText, 600));
  const answerExpanded = formatStudentAnswerForTelegram({
    questionType: params.questionType,
    studentAnswer: params.studentAnswer,
    optionsJson: params.optionsJson,
  });
  const ansLetters = escapeTelegramHtml(
    truncTelegramField(params.studentAnswer, 200)
  );
  const ansDetail = escapeTelegramHtml(
    truncTelegramField(answerExpanded, 1200)
  ).replace(/\n/g, "");
  const typeLabel = escapeTelegramHtml(String(params.questionType));
  const order = escapeTelegramHtml(String(params.orderIndex || "?"));
  const resultLine = params.correct
    ? `✅ <b>Correct</b>`
    : `❌ <b>Incorrect</b>`;

  const base = getPublicAppBaseUrl();
  const takePath = `/examination/${encodeURIComponent(params.examId)}/take`;
  const takeUrl = base ? `${base}${takePath}` : "";

  const lines = [
    `<b>Exam — answer checked</b> (progress)`,
    ``,
    `📚 <i>${title}</i>`,
    ``,
    `🆔 Exam <code>${examShort}…</code>`,
    `📎 Material <code>${midShort}…</code> · Q<b>${order}</b> · <code>${typeLabel}</code>`,
    `🔖 Question <code>${qidShort}…</code>`,
    ``,
    `<b>Question text</b>`,
    qText || `<i>(empty)</i>`,
    ``,
    `<b>Student answer</b>`,
    params.questionType === "mcq_single" || params.questionType === "mcq_multi"
      ? `Pilihan: <code>${ansLetters || "—"}</code>${ansDetail || `<i>(empty)</i>`}`
      : ansDetail || `<i>(empty)</i>`,
    ``,
    resultLine,
  ];
  if (takeUrl) {
    lines.push(``, `<a href="${escapeHref(takeUrl)}">Open exam (take)</a>`);
  }

  const result = await sendTelegramHtmlMessage(lines.join("\n"));
  if (!result.success && result.error !== "Telegram not configured") {
    console.warn("Exam check-answer Telegram notify:", result.error);
  }
}
