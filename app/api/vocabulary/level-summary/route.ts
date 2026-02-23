import { NextResponse } from 'next/server';
import { appendSheetData, getGoogleSheet, readSheetData } from '@/app/lib/googleSheets';

export async function POST(request: Request) {
    try {
        const { language, level, totalCorrect, totalAttempts, successRate, isPass, completedAt } = await request.json();

        if (!language || !level || totalAttempts === undefined) {
            return NextResponse.json({ error: 'Language, level, and statistics are required' }, { status: 400 });
        }

        const spreadsheetId = process.env.QUESTIONS_SHEET_ID || process.env.QUIZ_SHEET_ID;
        
        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Sheet ID not configured' }, { status: 500 });
        }

        // Get the Google Sheet document
        const doc = await getGoogleSheet(spreadsheetId);

        // Get or create the vocabulary level summary sheet
        const sheetName = 'Vocabulary-Level-Summary';
        let sheet = doc.sheetsByTitle[sheetName];

        if (!sheet) {
            // If sheet doesn't exist, create it
            sheet = await doc.addSheet({ title: sheetName });
            await sheet.setHeaderRow([
                'Language',
                'Level',
                'TotalCorrect',
                'TotalAttempts',
                'SuccessRate',
                'IsPass',
                'CompletedAt'
            ]);
        }

        // Prepare summary data
        const summaryData = {
            Language: language,
            Level: level,
            TotalCorrect: totalCorrect,
            TotalAttempts: totalAttempts,
            SuccessRate: successRate.toFixed(2),
            IsPass: isPass ? 'true' : 'false',
            CompletedAt: completedAt || new Date().toISOString()
        };

        // Save to Google Sheets
        await appendSheetData(
            spreadsheetId,
            [summaryData],
            sheetName
        );

        return NextResponse.json({
            success: true,
            message: 'Level summary saved successfully',
            isPass
        });
    } catch (error) {
        console.error('Error saving level summary:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save level summary' },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const language = searchParams.get('language');
        const level = searchParams.get('level');

        if (!language || !level) {
            return NextResponse.json({ error: 'Language and level are required' }, { status: 400 });
        }

        const spreadsheetId = process.env.QUESTIONS_SHEET_ID || process.env.QUIZ_SHEET_ID;
        
        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Sheet ID not configured' }, { status: 500 });
        }

        // Get the Google Sheet document
        const doc = await getGoogleSheet(spreadsheetId);
        const sheetName = 'Vocabulary-Level-Summary';
        const sheet = doc.sheetsByTitle[sheetName];

        if (!sheet) {
            return NextResponse.json({ isPass: false });
        }

        // Read all data from the sheet
        const data = await readSheetData(spreadsheetId, sheetName);
        
        // Find the most recent entry for this language and level
        const matchingEntries = data
            .filter((entry: any) => 
                (entry.Language || entry.language)?.toLowerCase() === language.toLowerCase() &&
                (entry.Level || entry.level) === level
            )
            .sort((a: any, b: any) => {
                const dateA = new Date(a.CompletedAt || a.completedAt || 0);
                const dateB = new Date(b.CompletedAt || b.completedAt || 0);
                return dateB.getTime() - dateA.getTime();
            });

        if (matchingEntries.length === 0) {
            return NextResponse.json({ isPass: false });
        }

        const latestEntry = matchingEntries[0];
        const isPass = (latestEntry.IsPass || latestEntry.isPass) === 'true' || latestEntry.IsPass === true;

        return NextResponse.json({
            isPass,
            successRate: latestEntry.SuccessRate || latestEntry.successRate,
            totalCorrect: latestEntry.TotalCorrect || latestEntry.totalCorrect,
            totalAttempts: latestEntry.TotalAttempts || latestEntry.totalAttempts
        });
    } catch (error) {
        console.error('Error fetching level summary:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch level summary' },
            { status: 500 }
        );
    }
}

