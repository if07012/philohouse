import {
  getGoogleSheet,
  readSheetData,
  appendSheetData,
  ensureSheetWithHeaders,
  listRowsBySheet,
} from '../../lib/googleSheets';

// Sheet names
const DISCIPLINE_CONFIG_SHEET = 'DisciplineConfig';
const TASKS_SHEET = 'Tasks';
const CHECK_INS_SHEET = 'CheckIns';

/**
 * Get spreadsheet ID from environment
 */
function getSpreadsheetId(): string | null {
  return (
    process.env.DISCIPLINE_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID ||
    null
  );
}

/**
 * Get task tolerance settings (in minutes)
 */
export function getTaskToleranceMinutes(): number {
  return parseInt(process.env.DISCIPLINE_TOLERANCE_MINUTES || '5', 10);
}

/**
 * Get maximum check-in window (in minutes before/after target time)
 */
export function getMaxCheckInWindow(): number {
  return parseInt(process.env.DISCIPLINE_MAX_WINDOW_MINUTES || '120', 10);
}

/**
 * Ensure Tasks and CheckIns sheets exist with correct headers
 */
export async function ensureDisciplineSheets(): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('DISCIPLINE_SPREADSHEET_ID not configured');
  }

  const { ensureSheetWithHeaders } = await import('../../lib/googleSheets');

  // Ensure Tasks sheet exists
  await ensureSheetWithHeaders(spreadsheetId, TASKS_SHEET, ['id', 'name', 'targetTime', 'description']);

  // Ensure CheckIns sheet exists
  await ensureSheetWithHeaders(
    spreadsheetId,
    CHECK_INS_SHEET,
    ['id', 'taskId', 'taskName', 'targetTime', 'completedAt', 'completedTime', 'delayMinutes', 'status', 'notes', 'createdAt']
  );
}

/**
 * Ensure CheckIns sheet exists with correct headers
 */
export async function ensureCheckInsSheet(): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('DISCIPLINE_SPREADSHEET_ID not configured');
  }

  const { ensureSheetWithHeaders } = await import('../../lib/googleSheets');

  await ensureSheetWithHeaders(
    spreadsheetId,
    CHECK_INS_SHEET,
    ['id', 'taskId', 'taskName', 'targetTime', 'completedAt', 'completedTime', 'delayMinutes', 'status', 'notes', 'createdAt']
  );
}

/**
 * Get tasks from Google Sheet
 */
export async function getTasksFromSheet(): Promise<Record<string, unknown>[]> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('DISCIPLINE_SPREADSHEET_ID not configured');
  }

  const tasks = await readSheetData(spreadsheetId, TASKS_SHEET);
  return tasks;
}

/**
 * Add a new check-in record to Google Sheet
 */
export async function addCheckInToSheet(checkIn: Record<string, unknown>): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('DISCIPLINE_SPREADSHEET_ID not configured');
  }

  // Ensure sheet exists with correct headers
  await ensureSheetWithHeaders(
    spreadsheetId,
    CHECK_INS_SHEET,
    Object.keys(checkIn)
  );

  await appendSheetData(spreadsheetId, [checkIn], CHECK_INS_SHEET);
}

/**
 * Get check-ins for a specific date from Google Sheet
 */
export async function getCheckInsForDate(date: string): Promise<Record<string, unknown>[]> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('DISCIPLINE_SPREADSHEET_ID not configured');
  }

  const allCheckIns = await listRowsBySheet(spreadsheetId, CHECK_INS_SHEET);

  // Filter by date (createdDate field)
  return allCheckIns.filter((row) => {
    const createdDate = String(row.createdDate || row.createdAt || '');
    // Extract date part (YYYY-MM-DD)
    return createdDate.startsWith(date);
  });
}

/**
 * Get all check-ins from Google Sheet
 */
export async function getAllCheckIns(): Promise<Record<string, unknown>[]> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('DISCIPLINE_SPREADSHEET_ID not configured');
  }

  return listRowsBySheet(spreadsheetId, CHECK_INS_SHEET);
}

/**
 * Parse task row from Google Sheet to Task object
 */
export function parseTaskRow(row: Record<string, unknown>): {
  id: string;
  name: string;
  targetTime: string;
  description?: string;
} {
  return {
    id: String(row.id || ''),
    name: String(row.name || row.taskName || ''),
    targetTime: String(row.targetTime || row.time || ''),
    description: row.description ? String(row.description) : undefined,
  };
}

/**
 * Parse check-in row from Google Sheet
 */
export function parseCheckInRow(row: Record<string, unknown>): {
  id: string;
  taskId: string;
  taskName: string;
  targetTime: string;
  completedAt: string;
  completedTime: string;
  delayMinutes: number;
  status: 'on_time' | 'late' | 'ignored';
  notes?: string;
  createdAt: string;
} {
  return {
    id: String(row.id || ''),
    taskId: String(row.taskId || ''),
    taskName: String(row.taskName || ''),
    targetTime: String(row.targetTime || ''),
    completedAt: String(row.completedAt || ''),
    completedTime: String(row.completedTime || ''),
    delayMinutes: Number(row.delayMinutes) || 0,
    status: row.status ? String(row.status) as 'on_time' | 'late' | 'ignored' : 'on_time',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.createdAt || row.createdDate || ''),
  };
}
