/**
 * Environment checklist (Mystery Reading):
 * - MYSTERY_READING_SPREADSHEET_ID - Google Spreadsheet ID (tabs created on first run)
 * - OPENAI_API_KEY - required (story generation + AI SDK image generation)
 * - OPENAI_MODEL - optional text model, default gpt-4o-mini
 * - OPENAI_IMAGE_MODEL - optional image model, default gpt-image-1
 * - MYSTERY_SESSION_SECRET - long random string for signed session cookies
 * - MYSTERY_CRON_SECRET or CRON_SECRET - Bearer / ?key= for generate endpoint
 * Reuse existing GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY for Sheets API.
 */

export function getMysterySpreadsheetId(): string {
  const id = process.env.MYSTERY_READING_SPREADSHEET_ID?.trim() || "";
  if (!id) {
    throw new Error("Missing MYSTERY_READING_SPREADSHEET_ID environment variable");
  }
  return id;
}

export function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim() || "";
  if (!key) throw new Error("Missing OPENAI_API_KEY environment variable");
  return key;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function getOpenAIImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
}

export function getMysterySessionSecret(): string {
  const s = process.env.MYSTERY_SESSION_SECRET?.trim() || "";
  if (!s) {
    throw new Error("Missing MYSTERY_SESSION_SECRET environment variable");
  }
  return s;
}

export function getMysteryCronSecret(): string {
  return (
    process.env.MYSTERY_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""
  );
}
