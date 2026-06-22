import { NextResponse } from 'next/server';
import {
  getConfiguration,
  updateConfiguration,
} from '@/app/badminton/lib/sheetHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/config
 * Get system configuration (attendance fee, shuttlecock price)
 */
export async function GET() {
  try {
    const config = await getConfiguration();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching config:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/badminton/config
 * Update system configuration
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { attendanceFee, defaultShuttlecockPrice } = body;

    if (attendanceFee !== undefined) {
      const fee = Number(attendanceFee);
      if (!Number.isFinite(fee) || fee <= 0) {
        return NextResponse.json(
          { success: false, error: 'Biaya kehadiran harus berupa angka positif' },
          { status: 400 }
        );
      }
    }

    if (defaultShuttlecockPrice !== undefined) {
      const price = Number(defaultShuttlecockPrice);
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { success: false, error: 'Harga shuttlecock harus berupa angka positif' },
          { status: 400 }
        );
      }
    }

    if (attendanceFee === undefined && defaultShuttlecockPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada data yang diperbarui' },
        { status: 400 }
      );
    }

    const config = await updateConfiguration({
      attendanceFee: attendanceFee !== undefined ? Number(attendanceFee) : undefined,
      defaultShuttlecockPrice:
        defaultShuttlecockPrice !== undefined ? Number(defaultShuttlecockPrice) : undefined,
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating config:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
