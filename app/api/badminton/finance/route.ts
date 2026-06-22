import { NextResponse } from 'next/server';
import { getFinanceReport } from '@/app/badminton/lib/financeHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/finance
 * Combined finance report: KPIs, cash flow, income & expense lists
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();

    const report = await getFinanceReport({ from, to });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error fetching finance report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
