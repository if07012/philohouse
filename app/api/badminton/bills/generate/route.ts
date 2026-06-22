import { NextResponse } from 'next/server';
import { generateAllPendingBills } from '@/app/badminton/lib/gameHelpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/badminton/bills/generate
 * Generate tagihan for all settled games (batch)
 */
export async function POST() {
  try {
    const result = await generateAllPendingBills();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error generating bills:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
