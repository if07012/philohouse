import { NextResponse } from 'next/server';
import { readSheetData } from '../../../app/lib/googleSheets';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sheet = searchParams.get('sheet');

        if (!sheet) {
            return NextResponse.json({ error: 'Sheet parameter is required' }, { status: 400 });
        }

        // Get the spreadsheet ID from environment variable
        const spreadsheetId = process.env.QUESTIONS_SHEET_ID || process.env.QUIZ_SHEET_ID;
        
        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Sheet ID not configured' }, { status: 500 });
        }

        // Read data from the specified sheet
        const data = await readSheetData(spreadsheetId, sheet);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sheet data' },
            { status: 500 }
        );
    }
}

