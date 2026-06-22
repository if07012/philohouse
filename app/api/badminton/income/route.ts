import { NextResponse } from 'next/server';
import {
  listManualIncome,
  filterManualIncome,
  getIncomeSummary,
  recordManualIncome,
} from '@/app/badminton/lib/incomeHelpers';
import type { IncomeCategory, PaymentMethod } from '@/app/badminton/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/income
 * List manual income with optional filters and summary
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();
    const category = searchParams.get('category')?.trim()?.toUpperCase() as
      | IncomeCategory
      | undefined;
    const includeSummary = searchParams.get('summary') === 'true';

    let income = await listManualIncome();
    income = filterManualIncome(income, { category, from, to });

    const response: {
      success: boolean;
      income: typeof income;
      summary?: Awaited<ReturnType<typeof getIncomeSummary>>;
    } = { success: true, income };

    if (includeSummary) {
      response.summary = await getIncomeSummary({ from, to });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching income:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, income: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/badminton/income
 * Record manual income
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionDate, category, description, amount, paymentMethod } = body;

    if (!category || !String(category).trim()) {
      return NextResponse.json(
        { success: false, error: 'Kategori wajib dipilih' },
        { status: 400 }
      );
    }

    const income = await recordManualIncome({
      transactionDate: transactionDate ? String(transactionDate) : undefined,
      category: String(category).toUpperCase() as IncomeCategory,
      description: String(description || ''),
      amount: Number(amount),
      paymentMethod: String(paymentMethod || 'CASH').toUpperCase() as PaymentMethod,
    });

    return NextResponse.json({ success: true, income });
  } catch (error) {
    console.error('Error recording income:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
