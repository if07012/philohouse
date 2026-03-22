import { sendTelegramHtmlMessage } from "@/app/lib/telegramSend";
import { getScoreSummaryLines } from "./examScoreSummary";
import type { EvaluationItem } from "./types";

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
