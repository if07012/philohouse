import { NextResponse } from 'next/server';
import { listBillsWithDetails, listBillsGroupedByMember } from '@/app/badminton/lib/billHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/bills
 * List all member bills with details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get('grouped') === 'true';
    const status = searchParams.get('status')?.toUpperCase();
    const memberId = searchParams.get('memberId')?.trim();

    let bills = await listBillsWithDetails();

    if (memberId) {
      bills = bills.filter((b) => b.memberId === memberId);
    }

    if (status === 'UNPAID' || status === 'PARTIAL' || status === 'PAID') {
      bills = bills.filter((b) => b.paymentStatus === status);
    }

    if (grouped) {
      let groupedBills = await listBillsGroupedByMember();
      if (memberId) {
        groupedBills = groupedBills.filter((g) => g.memberId === memberId);
      }
      if (status === 'UNPAID' || status === 'PARTIAL' || status === 'PAID') {
        groupedBills = groupedBills
          .map((g) => {
            const filtered = g.bills.filter((b) => b.paymentStatus === status);
            return {
              ...g,
              bills: filtered,
              totalOutstanding: filtered.reduce((s, b) => s + b.outstandingAmount, 0),
            };
          })
          .filter((g) => g.bills.length > 0);
      }
      return NextResponse.json({ success: true, grouped: groupedBills, bills });
    }

    return NextResponse.json({ success: true, bills });
  } catch (error) {
    console.error('Error fetching bills:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message, bills: [] }, { status: 500 });
  }
}
