import { NextResponse } from 'next/server';
import { settleGame } from '@/app/badminton/lib/gameHelpers';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/badminton/games/[id]/settle
 * Record shuttlecock usage and calculate settlement preview
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const shuttlecockUsed = Number(body.shuttlecockUsed);

    if (!Number.isInteger(shuttlecockUsed) || shuttlecockUsed <= 0) {
      return NextResponse.json(
        { success: false, error: 'Jumlah shuttlecock harus bilangan bulat positif' },
        { status: 400 }
      );
    }

    const result = await settleGame(id, shuttlecockUsed);

    return NextResponse.json({
      success: true,
      game: result.game,
      settlement: result.settlement,
      preview: result.preview,
    });
  } catch (error) {
    console.error('Error settling game:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
