import { NextResponse } from 'next/server';
import {
  getMemberPaymentSummary,
  recordMemberPayment,
} from '@/app/badminton/lib/paymentHelpers';
import type { PaymentMethod } from '@/app/badminton/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/payments/member?memberId=...
 * Get member payment summary with all bills and payment history
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId')?.trim();

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID wajib diisi' },
        { status: 400 }
      );
    }

    const summary = await getMemberPaymentSummary(memberId);
    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Member tidak memiliki tagihan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error fetching member payment summary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/badminton/payments/member
 * Record payment for a member, auto-allocated across outstanding bills (oldest first)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, amount, paymentMethod, paymentDate, note } = body;

    if (!memberId || !String(memberId).trim()) {
      return NextResponse.json(
        { success: false, error: 'Member wajib dipilih' },
        { status: 400 }
      );
    }

    const result = await recordMemberPayment({
      memberId: String(memberId).trim(),
      amount: Number(amount),
      paymentMethod: String(paymentMethod || '').toUpperCase() as PaymentMethod,
      paymentDate: paymentDate ? String(paymentDate) : undefined,
      note: note !== undefined ? String(note) : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error recording member payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
