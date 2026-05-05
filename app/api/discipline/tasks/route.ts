import { NextResponse } from 'next/server';
import {
  getTasksFromSheet,
  parseTaskRow,
  ensureDisciplineSheets,
  getCheckInsForDate,
  parseCheckInRow,
} from '@/app/discipline/lib/sheetHelpers';
import { getCurrentDateInJakarta } from '@/app/discipline/lib/timeUtils';
import { appendSheetData } from '@/app/lib/googleSheets';

export const dynamic = 'force-dynamic';

/**
 * GET /api/discipline/tasks
 * Get all tasks from Google Sheet
 */
export async function GET() {
  try {
    const today = getCurrentDateInJakarta();
    const [tasksRaw, todayCheckInsRaw] = await Promise.all([
      getTasksFromSheet(),
      getCheckInsForDate(today),
    ]);

    const tasks = tasksRaw.map((row: any) => parseTaskRow(row));
    const checkedTaskIds = new Set(
      todayCheckInsRaw
        .map((row: any) => parseCheckInRow(row))
        .map((checkIn) => checkIn.taskId)
        .filter(Boolean)
    );

    const availableTasks = tasks.filter((task) => !checkedTaskIds.has(task.id));

    return NextResponse.json({
      success: true,
      tasks: availableTasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks from Google Sheet',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/discipline/tasks
 * Add a new task to Google Sheet
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, targetTime, description } = body;

    if (!name || !targetTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'name and targetTime are required',
        },
        { status: 400 }
      );
    }

    // Validate time format (HH:mm)
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

    const spreadsheetId = process.env.DISCIPLINE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          error: 'DISCIPLINE_SPREADSHEET_ID not configured',
        },
        { status: 500 }
      );
    }

    // Ensure sheets exist with correct headers
    await ensureDisciplineSheets();


    const task = {
      id: crypto.randomUUID(),
      name,
      targetTime,
      description: description || '',
    };

    await appendSheetData(spreadsheetId, [task], 'Tasks');

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Error adding task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add task to Google Sheet',
      },
      { status: 500 }
    );
  }
}
