import { NextResponse } from 'next/server';
import {
  addCheckInToSheet,
  getCheckInsForDate,
  parseCheckInRow,
  ensureCheckInsSheet,
} from '@/app/discipline/lib/sheetHelpers';
import {
  getCurrentTimeInJakarta,
  getCurrentDateInJakarta,
  calculateDelayMinutes,
  determineStatus,
} from '@/app/discipline/lib/timeUtils';

/**
 * GET /api/discipline/checkins
 * Get check-ins for today or a specific date
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getCurrentDateInJakarta();

    const checkInsRaw = await getCheckInsForDate(date);

    const checkIns = checkInsRaw.map((row) => parseCheckInRow(row));

    // Calculate summary
    const summary = calculateCheckInSummary(checkIns);

    return NextResponse.json({
      success: true,
      checkIns,
      summary,
    });
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch check-ins from Google Sheet',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/discipline/checkins
 * Create a new check-in record
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, taskName, targetTime, notes } = body;

    if (!taskId || !taskName || !targetTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'taskId, taskName, and targetTime are required',
        },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(targetTime)) {
      return NextResponse.json(
        {
          success: false,
          error: 'targetTime must be in HH:mm format',
        },
        { status: 400 }
      );
    }

    // Ensure CheckIns sheet exists with correct headers
    await ensureCheckInsSheet();

    // Get current time in Jakarta timezone
    const now = getCurrentTimeInJakarta();
    const completedAt = now.toISOString();
    const completedTimeString = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const createdAt = now.toISOString();

    // Calculate delay
    const delayMinutes = calculateDelayMinutes(targetTime, completedTimeString);
    const status = determineStatus(delayMinutes);
    let finalStatus = status;
    let finalDelayMinutes = delayMinutes;

    const checkIn = {
      id: crypto.randomUUID(),
      taskId,
      taskName,
      targetTime,
      completedAt,
      completedTime: completedTimeString,
      delayMinutes: finalDelayMinutes,
      status: finalStatus,
      notes: notes || '',
      createdAt,
    };

    await addCheckInToSheet(checkIn);

    // Also update task status in tasks sheet if needed
    // (optional: mark task as completed)

    return NextResponse.json({
      success: true,
      checkIn,
    });
  } catch (error) {
    console.error('Error creating check-in:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create check-in in Google Sheet',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate summary statistics from check-ins
 */
function calculateCheckInSummary(checkIns: any[]) {
  const totalTasks = checkIns.length;
  const onTimeCount = checkIns.filter((c) => c.status === 'on_time').length;
  const lateCount = checkIns.filter((c) => c.status === 'late').length;
  const ignoredCount = checkIns.filter((c) => c.status === 'ignored').length;
  const totalDelayMinutes = checkIns.reduce((sum, c) => sum + c.delayMinutes, 0);
  const onTimePercentage = totalTasks > 0 ? Math.round((onTimeCount / totalTasks) * 100) : 0;

  return {
    totalTasks,
    onTimeCount,
    lateCount,
    ignoredCount,
    totalDelayMinutes,
    onTimePercentage,
  };
}
