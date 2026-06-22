import {
  createRowWithId,
  listRowsBySheet,
  updateRowById,
  ensureSheetWithHeaders,
} from '@/app/lib/googleSheets';
import { getBadmintonSpreadsheetId } from './badmintonEnv';
import {
  MEMBER_BILLS_SHEET,
  MEMBER_BILL_HEADERS,
  PAYMENTS_SHEET,
  GAMES_SHEET,
  parseBillRow,
  parsePaymentRow,
  computePaymentStatus,
  reconcileBillAmounts,
  listMembers,
  ensureBadmintonSheetsOnce,
} from './sheetHelpers';
import { listBillsWithDetails } from './billHelpers';
import type {
  BillRecord,
  BillWithPayments,
  MemberPaymentResult,
  MemberPaymentSummary,
  PaymentAllocation,
  PaymentMethod,
  PaymentRecord,
  PaymentWithDetails,
  RevenueSummary,
} from './types';

const VALID_METHODS: PaymentMethod[] = ['CASH', 'TRANSFER', 'QRIS'];

export { computePaymentStatus };

export async function getBillById(id: string): Promise<BillRecord | null> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const [rows, paymentRows] = await Promise.all([
    listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET),
    listRowsBySheet(spreadsheetId, PAYMENTS_SHEET),
  ]);
  const row = rows.find((r) => String(r.id ?? '').trim() === String(id).trim());
  if (!row) return null;
  const bill = parseBillRow(row);
  if (!bill.id) return null;

  const paidFromPayments = paymentRows
    .map(parsePaymentRow)
    .filter((p) => p.memberBillId === bill.id)
    .reduce((sum, p) => sum + p.amount, 0);

  return reconcileBillAmounts(bill, paidFromPayments);
}

export async function getPaymentsForBill(billId: string): Promise<PaymentRecord[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, PAYMENTS_SHEET);
  return rows
    .filter((r) => String(r.memberBillId || '') === billId)
    .map(parsePaymentRow)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export async function getBillWithPayments(billId: string): Promise<BillWithPayments | null> {
  const bills = await listBillsWithDetails();
  const bill = bills.find((b) => b.id === billId);
  if (!bill) return null;
  const payments = await getPaymentsForBill(billId);
  return { ...bill, payments };
}

export async function recordPayment(data: {
  memberBillId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  note?: string;
}): Promise<{ payment: PaymentRecord; bill: BillRecord }> {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal pembayaran harus lebih dari 0');
  }

  const method = String(data.paymentMethod || '').toUpperCase() as PaymentMethod;
  if (!VALID_METHODS.includes(method)) {
    throw new Error('Metode pembayaran tidak valid (Cash / Transfer / QRIS)');
  }

  const bill = await getBillById(data.memberBillId);
  if (!bill) {
    throw new Error('Tagihan tidak ditemukan');
  }

  if (bill.outstandingAmount <= 0) {
    throw new Error('Tagihan sudah lunas');
  }

  if (amount > bill.outstandingAmount) {
    throw new Error(
      `Nominal melebihi sisa tagihan (${bill.outstandingAmount.toLocaleString('id-ID')})`
    );
  }

  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureBadmintonSheetsOnce();
  await ensureSheetWithHeaders(spreadsheetId, MEMBER_BILLS_SHEET, [...MEMBER_BILL_HEADERS]);
  await ensureSheetWithHeaders(spreadsheetId, PAYMENTS_SHEET, [
    'id',
    'memberBillId',
    'paymentDate',
    'amount',
    'paymentMethod',
    'note',
    'createdDate',
  ]);

  const paymentDate = data.paymentDate || new Date().toISOString();
  const createdDate = new Date().toISOString();
  const note = data.note?.trim() || '';

  const { id: paymentId } = await createRowWithId(spreadsheetId, PAYMENTS_SHEET, {
    memberBillId: data.memberBillId,
    paymentDate,
    amount: String(amount),
    paymentMethod: method,
    note,
    createdDate,
  });

  const newPaidAmount = bill.paidAmount + amount;
  const newOutstanding = bill.billAmount - newPaidAmount;
  const paymentStatus = computePaymentStatus(bill.billAmount, newPaidAmount);

  await updateRowById(spreadsheetId, MEMBER_BILLS_SHEET, bill.id, {
    paidAmount: String(newPaidAmount),
    outstandingAmount: String(Math.max(0, newOutstanding)),
    paymentStatus,
  });

  const payment: PaymentRecord = {
    id: paymentId,
    memberBillId: data.memberBillId,
    paymentDate,
    amount,
    paymentMethod: method,
    note: note || undefined,
    createdDate,
  };

  const updatedBill: BillRecord = {
    ...bill,
    paidAmount: newPaidAmount,
    outstandingAmount: Math.max(0, newOutstanding),
    paymentStatus,
  };

  return { payment, bill: updatedBill };
}

export function computePaymentAllocations(
  bills: { id: string; gameDate: string; outstandingAmount: number }[],
  amount: number
): PaymentAllocation[] {
  const outstanding = bills
    .filter((b) => b.outstandingAmount > 0)
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

  let remaining = amount;
  const allocations: PaymentAllocation[] = [];

  for (const bill of outstanding) {
    if (remaining <= 0) break;
    const allocatedAmount = Math.min(remaining, bill.outstandingAmount);
    if (allocatedAmount <= 0) continue;
    allocations.push({
      billId: bill.id,
      gameDate: bill.gameDate,
      outstandingAmount: bill.outstandingAmount,
      allocatedAmount,
    });
    remaining -= allocatedAmount;
  }

  return allocations;
}

export async function getMemberPaymentSummary(
  memberId: string
): Promise<MemberPaymentSummary | null> {
  const bills = await listBillsWithDetails();
  const memberBills = bills.filter((b) => b.memberId === memberId);
  if (memberBills.length === 0) return null;

  const billsWithPayments = await Promise.all(
    memberBills.map(async (bill) => ({
      ...bill,
      payments: await getPaymentsForBill(bill.id),
    }))
  );

  const allPayments = await listPaymentsWithDetails();
  const memberPayments = allPayments.filter((p) => p.memberId === memberId);

  return {
    memberId,
    memberName: memberBills[0].memberName,
    bills: billsWithPayments.sort((a, b) => a.gameDate.localeCompare(b.gameDate)),
    totalOutstanding: memberBills.reduce((s, b) => s + b.outstandingAmount, 0),
    totalPaid: memberBills.reduce((s, b) => s + b.paidAmount, 0),
    totalBilled: memberBills.reduce((s, b) => s + b.billAmount, 0),
    payments: memberPayments,
  };
}

export async function recordMemberPayment(data: {
  memberId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  note?: string;
}): Promise<MemberPaymentResult> {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal pembayaran harus lebih dari 0');
  }

  const summary = await getMemberPaymentSummary(data.memberId);
  if (!summary) {
    throw new Error('Member tidak memiliki tagihan');
  }

  if (summary.totalOutstanding <= 0) {
    throw new Error('Semua tagihan member sudah lunas');
  }

  if (amount > summary.totalOutstanding) {
    throw new Error(
      `Nominal melebihi total sisa tagihan (${summary.totalOutstanding.toLocaleString('id-ID')})`
    );
  }

  const allocations = computePaymentAllocations(summary.bills, amount);
  if (allocations.length === 0) {
    throw new Error('Tidak ada tagihan yang dapat dibayar');
  }

  const payments: PaymentRecord[] = [];
  const billsUpdated: BillRecord[] = [];

  for (const allocation of allocations) {
    const result = await recordPayment({
      memberBillId: allocation.billId,
      amount: allocation.allocatedAmount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate,
      note: data.note,
    });
    payments.push(result.payment);
    billsUpdated.push(result.bill);
  }

  return {
    payments,
    billsUpdated,
    totalAllocated: amount,
    allocations,
  };
}

export async function listPaymentsWithDetails(): Promise<PaymentWithDetails[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const [paymentRows, billRows, gameRows, members] = await Promise.all([
    listRowsBySheet(spreadsheetId, PAYMENTS_SHEET),
    listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET),
    listRowsBySheet(spreadsheetId, GAMES_SHEET),
    listMembers(),
  ]);

  const billMap = new Map(
    billRows.map((r) => {
      const bill = parseBillRow(r);
      return [bill.id, bill];
    })
  );
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const gameMap = new Map(
    gameRows.map((g) => [String(g.id || ''), String(g.gameDate || '')])
  );

  return paymentRows
    .map(parsePaymentRow)
    .filter((p) => p.id)
    .map((payment) => {
      const bill = billMap.get(payment.memberBillId);
      const memberId = bill?.memberId || '';
      const gameId = bill?.gameId || '';
      return {
        ...payment,
        memberId,
        memberName: memberMap.get(memberId) || 'Unknown',
        gameId,
        gameDate: gameMap.get(gameId) || '',
        billAmount: bill?.billAmount || 0,
      };
    })
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

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

export async function getRevenueSummary(options?: {
  from?: string;
  to?: string;
}): Promise<RevenueSummary> {
  let payments = await listPaymentsWithDetails();

  if (options?.from || options?.to) {
    payments = payments.filter((p) =>
      isInDateRange(p.paymentDate, options.from, options.to)
    );
  }

  const now = new Date();
  const thisMonthPayments = payments.filter((p) =>
    isInMonth(p.paymentDate, now.getFullYear(), now.getMonth())
  );

  const byMethodMap = new Map<string, { total: number; count: number }>();
  for (const p of payments) {
    const method = p.paymentMethod || 'UNKNOWN';
    const existing = byMethodMap.get(method) ?? { total: 0, count: 0 };
    existing.total += p.amount;
    existing.count += 1;
    byMethodMap.set(method, existing);
  }

  const byMemberMap = new Map<
    string,
    { memberName: string; total: number; count: number }
  >();
  for (const p of payments) {
    if (!p.memberId) continue;
    const existing = byMemberMap.get(p.memberId) ?? {
      memberName: p.memberName,
      total: 0,
      count: 0,
    };
    existing.total += p.amount;
    existing.count += 1;
    byMemberMap.set(p.memberId, existing);
  }

  return {
    totalRevenue: payments.reduce((s, p) => s + p.amount, 0),
    totalPayments: payments.length,
    revenueThisMonth: thisMonthPayments.reduce((s, p) => s + p.amount, 0),
    paymentsThisMonth: thisMonthPayments.length,
    byMethod: Array.from(byMethodMap.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total),
    byMember: Array.from(byMemberMap.entries())
      .map(([memberId, data]) => ({
        memberId,
        memberName: data.memberName,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total),
  };
}

export function filterPayments(
  payments: PaymentWithDetails[],
  options?: { memberId?: string; from?: string; to?: string; method?: string }
): PaymentWithDetails[] {
  return payments.filter((p) => {
    if (options?.memberId && p.memberId !== options.memberId) return false;
    if (options?.method && p.paymentMethod !== options.method) return false;
    if (!isInDateRange(p.paymentDate, options?.from, options?.to)) return false;
    return true;
  });
}
