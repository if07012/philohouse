import { NextResponse } from 'next/server';
import {
  listExpenses,
  filterExpenses,
  getExpenseSummary,
  recordExpense,
} from '@/app/badminton/lib/expenseHelpers';
import type { ExpenseCategory } from '@/app/badminton/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/expenses
 * List expenses with optional filters and summary
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();
    const category = searchParams.get('category')?.trim()?.toUpperCase() as
      | ExpenseCategory
      | undefined;
    const includeSummary = searchParams.get('summary') === 'true';

    let expenses = await listExpenses();
    expenses = filterExpenses(expenses, { category, from, to });

    const response: {
      success: boolean;
      expenses: typeof expenses;
      summary?: Awaited<ReturnType<typeof getExpenseSummary>>;
    } = { success: true, expenses };

    if (includeSummary) {
      response.summary = await getExpenseSummary({ from, to });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, expenses: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/badminton/expenses
 * Record a new expense
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionDate, category, description, amount } = body;

    if (!category || !String(category).trim()) {
      return NextResponse.json(
        { success: false, error: 'Kategori wajib dipilih' },
        { status: 400 }
      );
    }

    const expense = await recordExpense({
      transactionDate: transactionDate ? String(transactionDate) : undefined,
      category: String(category).toUpperCase() as ExpenseCategory,
      description: String(description || ''),
      amount: Number(amount),
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error recording expense:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
