import { NextResponse } from 'next/server';
import {
  getGameById,
  buildBillPreviewForGame,
} from '@/app/badminton/lib/gameHelpers';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/badminton/games/[id]
 * Get game detail, optional bill preview with ?shuttlecockUsed=N
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const game = await getGameById(id);
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Permainan tidak ditemukan' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shuttlecockUsedParam = searchParams.get('shuttlecockUsed');
    let preview;

    if (shuttlecockUsedParam) {
      const shuttlecockUsed = Number(shuttlecockUsedParam);
      if (Number.isInteger(shuttlecockUsed) && shuttlecockUsed > 0) {
        preview = await buildBillPreviewForGame(game, shuttlecockUsed);
      }
    } else if (game.settlement) {
      preview = await buildBillPreviewForGame(game, game.settlement.shuttlecockUsed);
    }

    return NextResponse.json({ success: true, game, preview });
  } catch (error) {
    console.error('Error fetching game:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
