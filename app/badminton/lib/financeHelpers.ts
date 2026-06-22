import { listBillsWithDetails } from './billHelpers';
import { listExpenses, filterExpenses, getExpenseSummary } from './expenseHelpers';
import { listManualIncome, filterManualIncome, summarizeIncomeRecords } from './incomeHelpers';
import { listGamesWithDetails } from './gameHelpers';
import {
  listPaymentsWithDetails,
  filterPayments,
  getRevenueSummary,
} from './paymentHelpers';
import { listMembers } from './sheetHelpers';
import type { FinanceReport, IncomeLineItem, IncomeRecord, PaymentWithDetails } from './types';

function isBeforeDate(dateStr: string, from: string): boolean {
  const d = new Date(dateStr).getTime();
  const start = new Date(from).getTime();
  if (Number.isNaN(d) || Number.isNaN(start)) return false;
  return d < start;
}

function sumAmounts(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function buildIncomeLines(
  payments: PaymentWithDetails[],
  manualIncome: IncomeRecord[]
): IncomeLineItem[] {
  const memberLines: IncomeLineItem[] = payments.map((payment) => ({
    id: payment.id,
    date: payment.paymentDate,
    source: 'MEMBER',
    label: payment.memberName,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
  }));

  const manualLines: IncomeLineItem[] = manualIncome.map((item) => ({
    id: item.id,
    date: item.transactionDate,
    source: 'MANUAL',
    label: item.description,
    category: item.category,
    amount: item.amount,
    paymentMethod: item.paymentMethod,
  }));

  return [...memberLines, ...manualLines].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getFinanceReport(options?: {
  from?: string;
  to?: string;
}): Promise<FinanceReport> {
  const [allPayments, allManualIncome, allExpenses, bills, games, members] =
    await Promise.all([
      listPaymentsWithDetails(),
      listManualIncome(),
      listExpenses(),
      listBillsWithDetails(),
      listGamesWithDetails(),
      listMembers(),
    ]);

  const payments = filterPayments(allPayments, options);
  const manualIncome = filterManualIncome(allManualIncome, options);
  const expenses = filterExpenses(allExpenses, options);

  const paymentsBeforePeriod = options?.from
    ? allPayments.filter((p) => isBeforeDate(p.paymentDate, options.from!))
    : [];
  const manualIncomeBeforePeriod = options?.from
    ? allManualIncome.filter((item) => isBeforeDate(item.transactionDate, options.from!))
    : [];
  const expensesBeforePeriod = options?.from
    ? allExpenses.filter((e) => isBeforeDate(e.transactionDate, options.from!))
    : [];

  const openingBalance =
    sumAmounts(paymentsBeforePeriod) +
    sumAmounts(manualIncomeBeforePeriod) -
    sumAmounts(expensesBeforePeriod);
  const totalIncome = sumAmounts(payments) + sumAmounts(manualIncome);
  const totalExpenses = sumAmounts(expenses);
  const closingBalance = openingBalance + totalIncome - totalExpenses;

  const [revenueSummary, expenseSummary] = await Promise.all([
    getRevenueSummary(options),
    getExpenseSummary(options),
  ]);
  const incomeSummary = summarizeIncomeRecords(manualIncome);

  const totalOutstanding = bills.reduce((sum, bill) => sum + bill.outstandingAmount, 0);
  const activeMembers = members.filter((m) => m.isActive).length;
  const allTimeIncome =
    sumAmounts(allPayments) + sumAmounts(allManualIncome);

  return {
    kpis: {
      cashBalance: allTimeIncome - sumAmounts(allExpenses),
      totalOutstanding,
      revenueThisMonth: revenueSummary.revenueThisMonth + incomeSummary.incomeThisMonth,
      expensesThisMonth: expenseSummary.expensesThisMonth,
      totalGames: games.length,
      activeMembers,
    },
    cashReport: {
      openingBalance,
      totalIncome,
      totalExpenses,
      closingBalance,
    },
    revenueSummary,
    incomeSummary,
    expenseSummary,
    payments,
    manualIncome,
    incomeLines: buildIncomeLines(payments, manualIncome),
    expenses,
  };
}
