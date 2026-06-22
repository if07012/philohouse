import {
  createRowWithId,
  listRowsBySheet,
  ensureSheetWithHeaders,
} from '@/app/lib/googleSheets';
import { getBadmintonSpreadsheetId } from './badmintonEnv';
import {
  INCOME_SHEET,
  INCOME_HEADERS,
  parseIncomeRow,
  ensureBadmintonSheetsOnce,
} from './sheetHelpers';
import type {
  IncomeCategory,
  IncomeRecord,
  IncomeSummary,
  PaymentMethod,
} from './types';

const VALID_CATEGORIES: IncomeCategory[] = [
  'DONATION',
  'SPONSOR',
  'TOURNAMENT',
  'MEMBERSHIP',
  'OTHER',
];

const VALID_METHODS: PaymentMethod[] = ['CASH', 'TRANSFER', 'QRIS'];

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

export async function listManualIncome(): Promise<IncomeRecord[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, INCOME_SHEET);
  return rows
    .map(parseIncomeRow)
    .filter((item) => item.id)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

export function filterManualIncome(
  income: IncomeRecord[],
  options?: { category?: IncomeCategory; from?: string; to?: string }
): IncomeRecord[] {
  return income.filter((item) => {
    if (options?.category && item.category !== options.category) return false;
    if (!isInDateRange(item.transactionDate, options?.from, options?.to)) return false;
    return true;
  });
}

export function summarizeIncomeRecords(income: IncomeRecord[]): IncomeSummary {
  const now = new Date();
  const thisMonthIncome = income.filter((item) =>
    isInMonth(item.transactionDate, now.getFullYear(), now.getMonth())
  );

  const byCategoryMap = new Map<IncomeCategory, { total: number; count: number }>();
  const byMethodMap = new Map<string, { total: number; count: number }>();

  for (const item of income) {
    const categoryEntry = byCategoryMap.get(item.category) ?? { total: 0, count: 0 };
    categoryEntry.total += item.amount;
    categoryEntry.count += 1;
    byCategoryMap.set(item.category, categoryEntry);

    const method = item.paymentMethod || 'UNKNOWN';
    const methodEntry = byMethodMap.get(method) ?? { total: 0, count: 0 };
    methodEntry.total += item.amount;
    methodEntry.count += 1;
    byMethodMap.set(method, methodEntry);
  }

  return {
    totalIncome: income.reduce((sum, item) => sum + item.amount, 0),
    totalTransactions: income.length,
    incomeThisMonth: thisMonthIncome.reduce((sum, item) => sum + item.amount, 0),
    transactionsThisMonth: thisMonthIncome.length,
    byCategory: Array.from(byCategoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total),
    byMethod: Array.from(byMethodMap.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total),
  };
}

export async function getIncomeSummary(options?: {
  from?: string;
  to?: string;
}): Promise<IncomeSummary> {
  let income = await listManualIncome();

  if (options?.from || options?.to) {
    income = filterManualIncome(income, { from: options.from, to: options.to });
  }

  return summarizeIncomeRecords(income);
}

export async function recordManualIncome(data: {
  transactionDate?: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
}): Promise<IncomeRecord> {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal pendapatan harus lebih dari 0');
  }

  const category = String(data.category || '').toUpperCase() as IncomeCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error('Kategori pendapatan tidak valid');
  }

  const method = String(data.paymentMethod || '').toUpperCase() as PaymentMethod;
  if (!VALID_METHODS.includes(method)) {
    throw new Error('Metode pembayaran tidak valid (Cash / Transfer / QRIS)');
  }

  const description = data.description?.trim();
  if (!description) {
    throw new Error('Keterangan wajib diisi');
  }

  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureBadmintonSheetsOnce();
  await ensureSheetWithHeaders(spreadsheetId, INCOME_SHEET, [...INCOME_HEADERS]);

  const transactionDate = data.transactionDate || new Date().toISOString();
  const createdDate = new Date().toISOString();

  const { id } = await createRowWithId(spreadsheetId, INCOME_SHEET, {
    transactionDate,
    category,
    description,
    amount: String(amount),
    paymentMethod: method,
    createdDate,
  });

  return {
    id,
    transactionDate,
    category,
    description,
    amount,
    paymentMethod: method,
    createdDate,
  };
}
