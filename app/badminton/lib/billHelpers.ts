import { listRowsBySheet } from '@/app/lib/googleSheets';
import {
  MEMBER_BILLS_SHEET,
  GAMES_SHEET,
  PAYMENTS_SHEET,
  parseBillRow,
  parsePaymentRow,
  reconcileBillAmounts,
  listMembers,
} from './sheetHelpers';
import { getBadmintonSpreadsheetId } from './badmintonEnv';
import { getCalendarDateInJakarta } from './dateUtils';
import type { MemberBillWithDetails, BillRecord } from './types';

export async function listAllBillRecords(): Promise<BillRecord[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET);
  return rows.map(parseBillRow).filter((b) => b.id);
}

/**
 * Members who already received attendance fee on a calendar day (Jakarta).
 * Includes members from existing bills and optional in-batch tracking.
 */
export async function getAttendanceChargedMembersByDate(): Promise<Map<string, Set<string>>> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const [bills, games] = await Promise.all([
    listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET),
    listRowsBySheet(spreadsheetId, GAMES_SHEET),
  ]);

  const gameMap = new Map(
    games.map((g) => [String(g.id || ''), String(g.gameDate || '')])
  );

  const map = new Map<string, Set<string>>();

  for (const row of bills) {
    const memberId = String(row.memberId || '');
    const gameId = String(row.gameId || '');
    if (!memberId || !gameId) continue;

    const gameDate = gameMap.get(gameId);
    if (!gameDate) continue;

    const day = getCalendarDateInJakarta(gameDate);
    const bill = parseBillRow(row);
    const hasAttendanceField =
      row.attendanceFeeAmount !== undefined && String(row.attendanceFeeAmount).trim() !== '';
    const chargedAttendance = hasAttendanceField
      ? bill.attendanceFeeAmount > 0
      : bill.billAmount > 0;

    if (chargedAttendance) {
      if (!map.has(day)) map.set(day, new Set());
      map.get(day)!.add(memberId);
    }
  }

  return map;
}

export function markAttendanceCharged(
  map: Map<string, Set<string>>,
  calendarDate: string,
  memberId: string
): void {
  if (!map.has(calendarDate)) map.set(calendarDate, new Set());
  map.get(calendarDate)!.add(memberId);
}

export function isAttendanceChargedForMember(
  map: Map<string, Set<string>>,
  calendarDate: string,
  memberId: string
): boolean {
  return map.get(calendarDate)?.has(memberId) ?? false;
}

function buildPaidAmountByBillId(
  paymentRows: Record<string, unknown>[]
): Map<string, number> {
  const paidByBill = new Map<string, number>();
  for (const row of paymentRows) {
    const payment = parsePaymentRow(row);
    if (!payment.memberBillId) continue;
    paidByBill.set(
      payment.memberBillId,
      (paidByBill.get(payment.memberBillId) ?? 0) + payment.amount
    );
  }
  return paidByBill;
}

export async function listBillsWithDetails(): Promise<MemberBillWithDetails[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const [billRows, gameRows, memberRows, paymentRows] = await Promise.all([
    listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET),
    listRowsBySheet(spreadsheetId, GAMES_SHEET),
    listMembers(),
    listRowsBySheet(spreadsheetId, PAYMENTS_SHEET),
  ]);

  const memberMap = new Map(memberRows.map((m) => [m.id, m.name]));
  const gameMap = new Map(
    gameRows.map((g) => [
      String(g.id || ''),
      {
        gameDate: String(g.gameDate || ''),
        location: g.location ? String(g.location) : undefined,
      },
    ])
  );
  const paidByBill = buildPaidAmountByBillId(paymentRows);

  const bills = billRows.map(parseBillRow).filter((b) => b.id);

  return bills
    .map((bill) => {
      const reconciled = reconcileBillAmounts(bill, paidByBill.get(bill.id) ?? 0);
      const game = gameMap.get(reconciled.gameId);
      return {
        ...reconciled,
        memberName: memberMap.get(reconciled.memberId) || 'Unknown',
        gameDate: game?.gameDate || '',
        gameLocation: game?.location,
      };
    })
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate));
}

export async function listBillsGroupedByMember(): Promise<
  { memberId: string; memberName: string; bills: MemberBillWithDetails[]; totalOutstanding: number }[]
> {
  const bills = await listBillsWithDetails();
  const grouped = new Map<
    string,
    { memberId: string; memberName: string; bills: MemberBillWithDetails[]; totalOutstanding: number }
  >();

  for (const bill of bills) {
    const existing = grouped.get(bill.memberId);
    if (existing) {
      existing.bills.push(bill);
      existing.totalOutstanding += bill.outstandingAmount;
    } else {
      grouped.set(bill.memberId, {
        memberId: bill.memberId,
        memberName: bill.memberName,
        bills: [bill],
        totalOutstanding: bill.outstandingAmount,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.memberName.localeCompare(b.memberName, 'id')
  );
}
