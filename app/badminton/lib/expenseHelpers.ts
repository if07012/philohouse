import {
  createRowWithId,
  listRowsBySheet,
  ensureSheetWithHeaders,
} from '@/app/lib/googleSheets';
import { getBadmintonSpreadsheetId } from './badmintonEnv';
import {
  EXPENSES_SHEET,
  EXPENSE_HEADERS,
  parseExpenseRow,
  ensureBadmintonSheetsOnce,
} from './sheetHelpers';
import type { ExpenseCategory, ExpenseRecord, ExpenseSummary } from './types';

const VALID_CATEGORIES: ExpenseCategory[] = [
  'SHUTTLECOCK',
  'COURT_RENT',
  'TOURNAMENT',
  'CONSUMPTION',
  'EQUIPMENT',
  'OTHER',
];

function isInMonth(dateStr: string, year: number, month: number): boolean {
  try {
    const d = new Date(dateStr);
    return d.getFullYear() === year && d.getMonth() === month;
  } catch {
    return false;
  }
}

function isInDateRange(dateStr: string, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return false;
  if (from && d < new Date(from).getTime()) return false;
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    if (d > toEnd.getTime()) return false;
  }
  return true;
}

export async function listExpenses(): Promise<ExpenseRecord[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, EXPENSES_SHEET);
  return rows
    .map(parseExpenseRow)
    .filter((e) => e.id)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

export function filterExpenses(
  expenses: ExpenseRecord[],
  options?: { category?: ExpenseCategory; from?: string; to?: string }
): ExpenseRecord[] {
  return expenses.filter((e) => {
    if (options?.category && e.category !== options.category) return false;
    if (!isInDateRange(e.transactionDate, options?.from, options?.to)) return false;
    return true;
  });
}

export async function getExpenseSummary(options?: {
  from?: string;
  to?: string;
}): Promise<ExpenseSummary> {
  let expenses = await listExpenses();

  if (options?.from || options?.to) {
    expenses = filterExpenses(expenses, { from: options.from, to: options.to });
  }

  const now = new Date();
  const thisMonthExpenses = expenses.filter((e) =>
    isInMonth(e.transactionDate, now.getFullYear(), now.getMonth())
  );

  const byCategoryMap = new Map<ExpenseCategory, { total: number; count: number }>();
  for (const e of expenses) {
    const existing = byCategoryMap.get(e.category) ?? { total: 0, count: 0 };
    existing.total += e.amount;
    existing.count += 1;
    byCategoryMap.set(e.category, existing);
  }

  return {
    totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
    totalTransactions: expenses.length,
    expensesThisMonth: thisMonthExpenses.reduce((s, e) => s + e.amount, 0),
    transactionsThisMonth: thisMonthExpenses.length,
    byCategory: Array.from(byCategoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total),
  };
}

export async function recordExpense(data: {
  transactionDate?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
}): Promise<ExpenseRecord> {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal pengeluaran harus lebih dari 0');
  }

  const category = String(data.category || '').toUpperCase() as ExpenseCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error('Kategori pengeluaran tidak valid');
  }

  const description = data.description?.trim();
  if (!description) {
    throw new Error('Keterangan wajib diisi');
  }

  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureBadmintonSheetsOnce();
  await ensureSheetWithHeaders(spreadsheetId, EXPENSES_SHEET, [...EXPENSE_HEADERS]);

  const transactionDate = data.transactionDate || new Date().toISOString();
  const createdDate = new Date().toISOString();

  const { id } = await createRowWithId(spreadsheetId, EXPENSES_SHEET, {
    transactionDate,
    category,
    description,
    amount: String(amount),
    createdDate,
  });

  return {
    id,
    transactionDate,
    category,
    description,
    amount,
    createdDate,
  };
}
