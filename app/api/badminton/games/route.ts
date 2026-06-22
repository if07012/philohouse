import { NextResponse } from 'next/server';
import { createGame, listGamesWithDetails } from '@/app/badminton/lib/gameHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/games
 * List all games with players and settlement info
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.toUpperCase();

    let games = await listGamesWithDetails();

    if (status === 'ACTIVE' || status === 'FINISHED') {
      games = games.filter((g) => g.status === status);
    }

    return NextResponse.json({ success: true, games });
  } catch (error) {
    console.error('Error fetching games:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message, games: [] }, { status: 500 });
  }
}

/**
 * POST /api/badminton/games
 * Create a new game with exactly 4 players
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameDate, location, playerIds } = body;

    if (!gameDate?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tanggal main wajib diisi' },
        { status: 400 }
      );
    }

    if (!Array.isArray(playerIds)) {
      return NextResponse.json(
        { success: false, error: 'playerIds harus berupa array' },
        { status: 400 }
      );
    }

    const game = await createGame({
      gameDate: gameDate.trim(),
      location: location?.trim(),
      playerIds,
    });

    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error('Error creating game:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
