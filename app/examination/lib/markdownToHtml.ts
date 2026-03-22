import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

/**
 * Convert Markdown to sanitized HTML for safe rendering (e.g. material preview).
 */
export function markdownToSafeHtml(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) return "";

  const raw = marked.parse(trimmed, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;

  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  });
}
