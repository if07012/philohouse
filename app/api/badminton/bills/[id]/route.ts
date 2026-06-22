import { NextResponse } from 'next/server';
import { getBillWithPayments } from '@/app/badminton/lib/paymentHelpers';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/badminton/bills/[id]
 * Get bill detail with payment history
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bill = await getBillWithPayments(id);

    if (!bill) {
      return NextResponse.json(
        { success: false, error: 'Tagihan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, bill });
  } catch (error) {
    console.error('Error fetching bill:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
