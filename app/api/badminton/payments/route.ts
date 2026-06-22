import { NextResponse } from 'next/server';
import {
  recordPayment,
  listPaymentsWithDetails,
  getRevenueSummary,
  filterPayments,
} from '@/app/badminton/lib/paymentHelpers';
import type { PaymentMethod } from '@/app/badminton/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/payments
 * List payments with optional filters and revenue summary
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId')?.trim();
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();
    const method = searchParams.get('method')?.trim()?.toUpperCase();
    const includeSummary = searchParams.get('summary') === 'true';

    let payments = await listPaymentsWithDetails();
    payments = filterPayments(payments, { memberId, from, to, method });

    const response: {
      success: boolean;
      payments: typeof payments;
      summary?: Awaited<ReturnType<typeof getRevenueSummary>>;
    } = { success: true, payments };

    if (includeSummary) {
      response.summary = await getRevenueSummary({ from, to });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching payments:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, payments: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/badminton/payments
 * Record a payment for a member bill
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberBillId, amount, paymentMethod, paymentDate, note } = body;

    if (!memberBillId || !String(memberBillId).trim()) {
      return NextResponse.json(
        { success: false, error: 'Tagihan wajib dipilih' },
        { status: 400 }
      );
    }

    const result = await recordPayment({
      memberBillId: String(memberBillId).trim(),
      amount: Number(amount),
      paymentMethod: String(paymentMethod || '').toUpperCase() as PaymentMethod,
      paymentDate: paymentDate ? String(paymentDate) : undefined,
      note: note !== undefined ? String(note) : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error recording payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
