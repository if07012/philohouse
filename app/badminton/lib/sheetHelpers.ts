import {
  ensureSheetWithHeaders,
  listRowsBySheet,
  createRowWithId,
  updateRowById,
  appendSheetData,
  SHEET_ROWS_SLOW_TTL_MS,
} from '@/app/lib/googleSheets';
import { getBadmintonSpreadsheetId } from './badmintonEnv';
import {
  getCachedMembers,
  setCachedMembers,
  invalidateMembersCache,
  getCachedConfiguration,
  setCachedConfiguration,
  invalidateConfigurationCache,
  runEnsureBadmintonSheetsOnce,
} from './badmintonCache';
import type {
  Member,
  MemberSummary,
  MemberWithSummary,
  AttendanceRecord,
  BillRecord,
  PaymentRecord,
  SystemConfiguration,
  ExpenseRecord,
  ExpenseCategory,
  IncomeRecord,
  IncomeCategory,
} from './types';

export const CONFIG_SHEET = 'Configuration';
export const CONFIG_ROW_ID = 'default';
export const DEFAULT_ATTENDANCE_FEE = 25_000;
export const DEFAULT_SHUTTLECOCK_PRICE = 18_000;

export const MEMBERS_SHEET = 'Members';
export const GAME_PLAYERS_SHEET = 'GamePlayers';
export const MEMBER_BILLS_SHEET = 'MemberBills';
export const PAYMENTS_SHEET = 'Payments';
export const EXPENSES_SHEET = 'ExpenseTransactions';
export const INCOME_SHEET = 'IncomeTransactions';
export const GAMES_SHEET = 'Games';
export const GAME_SETTLEMENT_SHEET = 'GameSettlement';

const GAME_SETTLEMENT_HEADERS = [
  'id',
  'gameId',
  'shuttlecockUsed',
  'shuttlecockPrice',
  'attendanceFee',
  'totalBillAmount',
  'createdDate',
] as const;

const MEMBER_HEADERS = ['id', 'name', 'phoneNumber', 'isActive', 'createdDate'] as const;
const GAME_PLAYER_HEADERS = ['id', 'gameId', 'memberId'] as const;
export const MEMBER_BILL_HEADERS = [
  'id',
  'gameId',
  'memberId',
  'billAmount',
  'attendanceFeeAmount',
  'shuttlecockFeeAmount',
  'paidAmount',
  'outstandingAmount',
  'paymentStatus',
  'createdDate',
] as const;
const PAYMENT_HEADERS = [
  'id',
  'memberBillId',
  'paymentDate',
  'amount',
  'paymentMethod',
  'note',
  'createdDate',
] as const;
export const EXPENSE_HEADERS = [
  'id',
  'transactionDate',
  'category',
  'description',
  'amount',
  'createdDate',
] as const;
export const INCOME_HEADERS = [
  'id',
  'transactionDate',
  'category',
  'description',
  'amount',
  'paymentMethod',
  'createdDate',
] as const;
const GAME_HEADERS = ['id', 'gameDate', 'location', 'status', 'createdDate'] as const;
const CONFIG_HEADERS = ['id', 'attendanceFee', 'defaultShuttlecockPrice', 'updatedAt'] as const;

function parseBool(value: unknown, defaultValue = true): boolean {
  if (value === true || value === 'true' || value === 'TRUE' || value === '1' || value === 1) {
    return true;
  }
  if (value === false || value === 'false' || value === 'FALSE' || value === '0' || value === 0) {
    return false;
  }
  return defaultValue;
}

function parseNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function computePaymentStatus(
  billAmount: number,
  paidAmount: number
): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paidAmount <= 0) return 'UNPAID';
  if (paidAmount >= billAmount) return 'PAID';
  return 'PARTIAL';
}

export function reconcileBillAmounts(
  bill: BillRecord,
  paidFromPayments: number
): BillRecord {
  const paidAmount = Math.max(bill.paidAmount, paidFromPayments);
  const outstandingAmount = Math.max(0, bill.billAmount - paidAmount);
  const paymentStatus = computePaymentStatus(bill.billAmount, paidAmount);
  return { ...bill, paidAmount, outstandingAmount, paymentStatus };
}

export function parseMemberRow(row: Record<string, unknown>): Member {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    phoneNumber: String(row.phoneNumber || ''),
    isActive: parseBool(row.isActive, true),
    createdDate: String(row.createdDate || ''),
  };
}

export function parseBillRow(row: Record<string, unknown>): BillRecord {
  const billAmount = parseNumber(row.billAmount);
  const shuttlecockFeeAmount = parseNumber(row.shuttlecockFeeAmount);
  const attendanceFeeAmount =
    row.attendanceFeeAmount !== undefined && row.attendanceFeeAmount !== ''
      ? parseNumber(row.attendanceFeeAmount)
      : billAmount - shuttlecockFeeAmount;
  const paidAmount = parseNumber(row.paidAmount);
  const storedOutstanding = parseNumber(row.outstandingAmount);
  const outstandingAmount =
    storedOutstanding > 0 || paidAmount <= 0
      ? storedOutstanding
      : Math.max(0, billAmount - paidAmount);
  const paymentStatus = computePaymentStatus(billAmount, paidAmount);

  return {
    id: String(row.id || ''),
    gameId: String(row.gameId || ''),
    memberId: String(row.memberId || ''),
    billAmount,
    attendanceFeeAmount: Math.max(0, attendanceFeeAmount),
    shuttlecockFeeAmount,
    paidAmount,
    outstandingAmount,
    paymentStatus,
    createdDate: String(row.createdDate || ''),
  };
}

export function parsePaymentRow(row: Record<string, unknown>): PaymentRecord {
  const note = String(row.note || '').trim();
  return {
    id: String(row.id || ''),
    memberBillId: String(row.memberBillId || ''),
    paymentDate: String(row.paymentDate || ''),
    amount: parseNumber(row.amount),
    paymentMethod: String(row.paymentMethod || ''),
    note: note || undefined,
    createdDate: String(row.createdDate || ''),
  };
}

const VALID_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'SHUTTLECOCK',
  'COURT_RENT',
  'TOURNAMENT',
  'CONSUMPTION',
  'EQUIPMENT',
  'OTHER',
];

export function parseExpenseCategory(value: unknown): ExpenseCategory {
  const category = String(value || 'OTHER').toUpperCase() as ExpenseCategory;
  return VALID_EXPENSE_CATEGORIES.includes(category) ? category : 'OTHER';
}

export function parseExpenseRow(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: String(row.id || ''),
    transactionDate: String(row.transactionDate || ''),
    category: parseExpenseCategory(row.category),
    description: String(row.description || '').trim(),
    amount: parseNumber(row.amount),
    createdDate: String(row.createdDate || ''),
  };
}

const VALID_INCOME_CATEGORIES: IncomeCategory[] = [
  'DONATION',
  'SPONSOR',
  'TOURNAMENT',
  'MEMBERSHIP',
  'OTHER',
];

export function parseIncomeCategory(value: unknown): IncomeCategory {
  const category = String(value || 'OTHER').toUpperCase() as IncomeCategory;
  return VALID_INCOME_CATEGORIES.includes(category) ? category : 'OTHER';
}

export function parseIncomeRow(row: Record<string, unknown>): IncomeRecord {
  return {
    id: String(row.id || ''),
    transactionDate: String(row.transactionDate || ''),
    category: parseIncomeCategory(row.category),
    description: String(row.description || '').trim(),
    amount: parseNumber(row.amount),
    paymentMethod: String(row.paymentMethod || 'CASH'),
    createdDate: String(row.createdDate || ''),
  };
}

export async function ensureBadmintonSheets(): Promise<void> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureSheetWithHeaders(spreadsheetId, CONFIG_SHEET, [...CONFIG_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, MEMBERS_SHEET, [...MEMBER_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, GAMES_SHEET, [...GAME_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, GAME_SETTLEMENT_SHEET, [...GAME_SETTLEMENT_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, GAME_PLAYERS_SHEET, [...GAME_PLAYER_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, MEMBER_BILLS_SHEET, [...MEMBER_BILL_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, PAYMENTS_SHEET, [...PAYMENT_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, EXPENSES_SHEET, [...EXPENSE_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, INCOME_SHEET, [...INCOME_HEADERS]);
}

/** Run full sheet bootstrap at most once per server process (writes only). */
export async function ensureBadmintonSheetsOnce(): Promise<void> {
  return runEnsureBadmintonSheetsOnce(ensureBadmintonSheets);
}

async function loadMemberRows(spreadsheetId: string): Promise<Record<string, unknown>[]> {
  return listRowsBySheet(spreadsheetId, MEMBERS_SHEET, SHEET_ROWS_SLOW_TTL_MS);
}

async function loadConfigRows(spreadsheetId: string): Promise<Record<string, unknown>[]> {
  return listRowsBySheet(spreadsheetId, CONFIG_SHEET, SHEET_ROWS_SLOW_TTL_MS);
}

function parseConfigRow(row: Record<string, unknown>): SystemConfiguration {
  const attendanceFee = parseNumber(row.attendanceFee);
  const defaultShuttlecockPrice = parseNumber(row.defaultShuttlecockPrice);
  return {
    attendanceFee: attendanceFee > 0 ? attendanceFee : DEFAULT_ATTENDANCE_FEE,
    defaultShuttlecockPrice:
      defaultShuttlecockPrice > 0 ? defaultShuttlecockPrice : DEFAULT_SHUTTLECOCK_PRICE,
    updatedAt: String(row.updatedAt || ''),
  };
}

export function getDefaultConfiguration(): SystemConfiguration {
  return {
    attendanceFee: DEFAULT_ATTENDANCE_FEE,
    defaultShuttlecockPrice: DEFAULT_SHUTTLECOCK_PRICE,
    updatedAt: '',
  };
}

export async function getConfiguration(): Promise<SystemConfiguration> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const cached = getCachedConfiguration(spreadsheetId);
  if (cached) return cached;

  const rows = await loadConfigRows(spreadsheetId);
  const row = rows.find((r) => String(r.id ?? '').trim() === CONFIG_ROW_ID);
  const config = row ? parseConfigRow(row) : getDefaultConfiguration();
  setCachedConfiguration(spreadsheetId, config);
  return config;
}

export async function updateConfiguration(data: {
  attendanceFee?: number;
  defaultShuttlecockPrice?: number;
}): Promise<SystemConfiguration> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureBadmintonSheetsOnce();
  await ensureSheetWithHeaders(spreadsheetId, CONFIG_SHEET, [...CONFIG_HEADERS]);

  const current = await getConfiguration();
  const attendanceFee =
    data.attendanceFee !== undefined ? data.attendanceFee : current.attendanceFee;
  const defaultShuttlecockPrice =
    data.defaultShuttlecockPrice !== undefined
      ? data.defaultShuttlecockPrice
      : current.defaultShuttlecockPrice;

  if (attendanceFee <= 0) {
    throw new Error('Biaya kehadiran harus lebih dari 0');
  }
  if (defaultShuttlecockPrice <= 0) {
    throw new Error('Harga shuttlecock harus lebih dari 0');
  }

  const updatedAt = new Date().toISOString();
  const payload = {
    attendanceFee: String(attendanceFee),
    defaultShuttlecockPrice: String(defaultShuttlecockPrice),
    updatedAt,
  };

  const rows = await loadConfigRows(spreadsheetId);
  const existing = rows.find((r) => String(r.id ?? '').trim() === CONFIG_ROW_ID);
  if (existing) {
    await updateRowById(spreadsheetId, CONFIG_SHEET, CONFIG_ROW_ID, payload);
  } else {
    await appendSheetData(
      spreadsheetId,
      [{ id: CONFIG_ROW_ID, ...payload }],
      CONFIG_SHEET
    );
  }

  const config = {
    attendanceFee,
    defaultShuttlecockPrice,
    updatedAt,
  };
  invalidateConfigurationCache(spreadsheetId);
  setCachedConfiguration(spreadsheetId, config);
  return config;
}

export async function listMembers(): Promise<Member[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const cached = getCachedMembers(spreadsheetId);
  if (cached) return cached;

  const rows = await loadMemberRows(spreadsheetId);
  const members = rows.map(parseMemberRow).filter((m) => m.id);
  setCachedMembers(spreadsheetId, members);
  return members;
}

export async function getMemberById(id: string): Promise<Member | null> {
  const members = await listMembers();
  return members.find((m) => m.id === String(id).trim()) ?? null;
}

export async function createMember(data: {
  name: string;
  phoneNumber: string;
  isActive?: boolean;
  createdDate?: string;
}): Promise<Member> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureBadmintonSheetsOnce();
  await ensureSheetWithHeaders(spreadsheetId, MEMBERS_SHEET, [...MEMBER_HEADERS]);

  const createdDate = data.createdDate || new Date().toISOString().slice(0, 10);
  const { id } = await createRowWithId(spreadsheetId, MEMBERS_SHEET, {
    name: data.name.trim(),
    phoneNumber: data.phoneNumber.trim(),
    isActive: String(data.isActive !== false),
    createdDate,
  });

  const member = {
    id,
    name: data.name.trim(),
    phoneNumber: data.phoneNumber.trim(),
    isActive: data.isActive !== false,
    createdDate,
  };
  invalidateMembersCache(spreadsheetId);
  return member;
}

export async function updateMember(
  id: string,
  data: { name?: string; phoneNumber?: string; isActive?: boolean }
): Promise<Member> {
  const existing = await getMemberById(id);
  if (!existing) {
    throw new Error('Member not found');
  }

  const spreadsheetId = getBadmintonSpreadsheetId();
  const patch: Record<string, string> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.phoneNumber !== undefined) patch.phoneNumber = data.phoneNumber.trim();
  if (data.isActive !== undefined) patch.isActive = String(data.isActive);

  await updateRowById(spreadsheetId, MEMBERS_SHEET, id, patch);
  invalidateMembersCache(spreadsheetId);

  return {
    ...existing,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber.trim() : existing.phoneNumber,
    isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
  };
}

export async function deactivateMember(id: string): Promise<Member> {
  return updateMember(id, { isActive: false });
}

async function getGamePlayersByMember(memberId: string): Promise<Record<string, unknown>[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, GAME_PLAYERS_SHEET);
  return rows.filter((r) => String(r.memberId || '') === memberId);
}

async function getBillsByMember(memberId: string): Promise<BillRecord[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET);
  return rows
    .filter((r) => String(r.memberId || '') === memberId)
    .map(parseBillRow);
}

async function getPaymentsForMemberBills(billIds: string[]): Promise<PaymentRecord[]> {
  if (billIds.length === 0) return [];
  const spreadsheetId = getBadmintonSpreadsheetId();
  const billIdSet = new Set(billIds);
  const rows = await listRowsBySheet(spreadsheetId, PAYMENTS_SHEET);
  return rows
    .filter((r) => billIdSet.has(String(r.memberBillId || '')))
    .map(parsePaymentRow);
}

export async function getMemberSummary(memberId: string): Promise<MemberSummary> {
  const [gamePlayers, bills] = await Promise.all([
    getGamePlayersByMember(memberId),
    getBillsByMember(memberId),
  ]);

  const billIds = bills.map((b) => b.id);
  const payments = await getPaymentsForMemberBills(billIds);

  const totalBills = bills.reduce((sum, b) => sum + b.billAmount, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingAmount = bills.reduce((sum, b) => sum + b.outstandingAmount, 0);

  return {
    attendanceCount: gamePlayers.length,
    totalBills,
    totalPayments,
    outstandingAmount,
  };
}

export async function listMembersWithSummary(): Promise<MemberWithSummary[]> {
  const members = await listMembers();
  if (members.length === 0) return [];

  const spreadsheetId = getBadmintonSpreadsheetId();
  const [gamePlayers, billRows, paymentRows] = await Promise.all([
    listRowsBySheet(spreadsheetId, GAME_PLAYERS_SHEET),
    listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET),
    listRowsBySheet(spreadsheetId, PAYMENTS_SHEET),
  ]);

  const billsByMember = new Map<string, BillRecord[]>();
  for (const row of billRows) {
    const memberId = String(row.memberId || '');
    if (!memberId) continue;
    const bill = parseBillRow(row);
    const list = billsByMember.get(memberId) ?? [];
    list.push(bill);
    billsByMember.set(memberId, list);
  }

  const billIdSet = new Set(billRows.map((r) => String(r.id || '')).filter(Boolean));
  const paymentsByBill = new Map<string, PaymentRecord[]>();
  for (const row of paymentRows) {
    const billId = String(row.memberBillId || '');
    if (!billIdSet.has(billId)) continue;
    const payment = parsePaymentRow(row);
    const list = paymentsByBill.get(billId) ?? [];
    list.push(payment);
    paymentsByBill.set(billId, list);
  }

  const attendanceByMember = new Map<string, number>();
  for (const row of gamePlayers) {
    const memberId = String(row.memberId || '');
    if (!memberId) continue;
    attendanceByMember.set(memberId, (attendanceByMember.get(memberId) ?? 0) + 1);
  }

  return members.map((member) => {
    const bills = billsByMember.get(member.id) ?? [];
    const payments = bills.flatMap((b) => paymentsByBill.get(b.id) ?? []);
    return {
      ...member,
      summary: {
        attendanceCount: attendanceByMember.get(member.id) ?? 0,
        totalBills: bills.reduce((sum, b) => sum + b.billAmount, 0),
        totalPayments: payments.reduce((sum, p) => sum + p.amount, 0),
        outstandingAmount: bills.reduce((sum, b) => sum + b.outstandingAmount, 0),
      },
    };
  });
}

export async function getMemberAttendance(memberId: string): Promise<AttendanceRecord[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const [gamePlayers, games] = await Promise.all([
    getGamePlayersByMember(memberId),
    listRowsBySheet(spreadsheetId, GAMES_SHEET),
  ]);

  const gameMap = new Map(
    games.map((g) => [String(g.id || ''), g])
  );

  return gamePlayers.map((gp) => {
    const gameId = String(gp.gameId || '');
    const game = gameMap.get(gameId);
    return {
      gameId,
      gameDate: String(game?.gameDate || ''),
      location: game?.location ? String(game.location) : undefined,
    };
  });
}

export async function getMemberBills(memberId: string): Promise<BillRecord[]> {
  return getBillsByMember(memberId);
}

export async function getMemberPayments(memberId: string): Promise<PaymentRecord[]> {
  const bills = await getBillsByMember(memberId);
  return getPaymentsForMemberBills(bills.map((b) => b.id));
}

export { formatCurrency, formatDate } from './formatUtils';

