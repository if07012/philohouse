/**
 * Environment checklist (Mystery Reading):
 * - MYSTERY_READING_SPREADSHEET_ID - Google Spreadsheet ID (tabs created on first run)
 * - GATEWAY_API_KEY - required for Gateway AI SDK (ByteDance Seedream image generation)
 * - GATEWAY_BASE_URL - optional Gateway base URL, default https://gateway.ai.cloudflare.com/v1/
 * - QWEN_API_KEY - required for story generation (Qwen via OpenAI-compatible API)
 * - QWEN_MODEL - optional text model, default qwen-plus
 * - QWEN_BASE_URL - optional Qwen base URL, default https://dashscope-intl.aliyuncs.com/compatible-mode/v1
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

export function getQwenApiKey(): string {
  const key = process.env.QWEN_API_KEY?.trim() || "";
  if (!key) throw new Error("Missing QWEN_API_KEY environment variable");
  return key;
}

export function getQwenModel(): string {
  return process.env.QWEN_MODEL?.trim() || "qwen-plus";
}

export function getQwenBaseUrl(): string {
  return process.env.QWEN_BASE_URL?.trim() || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
}

export function getGatewayApiKey(): string {
  const key = process.env.GATEWAY_API_KEY?.trim() || "";
  if (!key) throw new Error("Missing GATEWAY_API_KEY environment variable");
  return key;
}

export function getGatewayBaseUrl(): string {
  return process.env.GATEWAY_BASE_URL?.trim() || "https://gateway.ai.cloudflare.com/v1/";
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
