import { NextResponse } from 'next/server';
import { readSheetData } from '../../lib/googleSheets';

type TodoItem = { id: number; label: string };

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  try {
    const spreadsheetId =
      process.env.TODO_SHEET_ID ||
      process.env.TODO_SPREADSHEET_ID ||
      process.env.NEXT_PUBLIC_TODO_SHEET_ID ||
      process.env.NEXT_PUBLIC_TODO_SPREADSHEET_ID;

    const todosSheetName =
      process.env.TODO_TODOS_SHEET_NAME ||
      process.env.TODO_SHEET_NAME ||
      'Todos';

    const statusSheetName =
      process.env.TODO_STATUS_SHEET_NAME || 'TodoStatus';

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          error:
            'TODO_SHEET_ID belum diset. Tambahkan TODO_SHEET_ID di file .env.',
        },
        { status: 500 }
      );
    }

    // 1) Baca daftar todo
    const rawTodos = await readSheetData(spreadsheetId, todosSheetName);
    const list: TodoItem[] = rawTodos
      .map((row: Record<string, unknown>, index: number) => {
        const keys = Object.keys(row).filter(
          (k) =>
            row[k] !== undefined &&
            row[k] !== null &&
            String(row[k]).trim() !== ''
        );
        const label = keys.length > 0 ? String(row[keys[0]]) : '';
        return { id: index, label, order: rawTodos[index].Order };
      })
      .filter((item) => item.label)
      .sort((a, b) => (a.order as number) - (b.order as number));
    // 2) Baca status todo yang sudah selesai utk hari ini
    const todayKey = getTodayKey();
    let doneIndexes: number[] = [];
    try {
      const statusRows = await readSheetData(spreadsheetId, statusSheetName);
      doneIndexes = statusRows
        .filter(
          (row: any) =>
            String(row.date) === todayKey &&
            (row.done === '1' ||
              row.done === 1 ||
              row.done === true ||
              String(row.done).toLowerCase() === 'true')
        )
        .map((row: any) => Number(row.index))
        .filter((n) => !Number.isNaN(n));
    } catch (e) {
      // Jika sheet status belum ada atau kosong, anggap belum ada yang done
      doneIndexes = [];
    }

    return NextResponse.json({ data: list, done: doneIndexes });
  } catch (error) {
    console.error('Error in GET /api/todo:', error);
    return NextResponse.json(
      { error: 'Failed to load todo list from Google Sheet' },
      { status: 500 }
    );
  }
}
