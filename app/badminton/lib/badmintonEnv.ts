/**
 * Environment checklist (Badminton Club Finance):
 * - BADMINTON_SPREADSHEET_ID - Google Spreadsheet ID (tabs created on first run)
 * Reuse existing GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY for Sheets API.
 */

export function getBadmintonSpreadsheetId(): string {
  const id =
    process.env.BADMINTON_SPREADSHEET_ID?.trim() ||
    process.env.GOOGLE_SHEET_ID?.trim() ||
    '';
  if (!id) {
    throw new Error('Missing BADMINTON_SPREADSHEET_ID environment variable');
  }
  return id;
}
