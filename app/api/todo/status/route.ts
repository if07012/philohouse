import { NextResponse } from 'next/server';
import { getGoogleSheet } from '../../../lib/googleSheets';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const index: number | undefined = body.index;
    const done: boolean | undefined = body.done;
    const date: string | undefined = body.date;

    if (index === undefined || done === undefined) {
      return NextResponse.json(
        { error: 'index dan done wajib diisi' },
        { status: 400 }
      );
    }

    const spreadsheetId =
      process.env.TODO_SHEET_ID ||
      process.env.TODO_SPREADSHEET_ID ||
      process.env.NEXT_PUBLIC_TODO_SHEET_ID ||
      process.env.NEXT_PUBLIC_TODO_SPREADSHEET_ID;

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

    const doc = await getGoogleSheet(spreadsheetId);
    let sheet = doc.sheetsByTitle[statusSheetName];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: statusSheetName,
        headerValues: ['date', 'index', 'done'],
      });
    }

    const rows = await sheet.getRows();
    const key = date || getTodayKey();

    const existing = rows.find(
      (r: any) =>
        String((r.toObject() as any).date) === key &&
        String((r.toObject() as any).index) === String(index)
    );

    if (existing) {
      if (done) {
        (existing as any).done = '1';
        await (existing as any).save();
      } else {
        // Jika di-uncheck, hapus baris status supaya benar‑benar hilang
        await (existing as any).delete();
      }
    } else if (done) {
      await sheet.addRow({
        date: key,
        index,
        done: '1',
      } as any);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/todo/status:', error);
    return NextResponse.json(
      { error: 'Failed to update todo status in Google Sheet' },
      { status: 500 }
    );
  }
}

