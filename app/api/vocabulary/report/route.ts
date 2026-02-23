import { NextResponse } from 'next/server';
import { appendSheetData, getGoogleSheet } from '@/app/lib/googleSheets';

export async function POST(request: Request) {
    try {
        const { language, level, wordResults, totalCorrect, totalAttempts, completedAt } = await request.json();

        if (!language || !level || !wordResults) {
            return NextResponse.json({ error: 'Language, level, and wordResults are required' }, { status: 400 });
        }

        const spreadsheetId = process.env.QUESTIONS_SHEET_ID || process.env.QUIZ_SHEET_ID;

        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Sheet ID not configured' }, { status: 500 });
        }

        // Get the Google Sheet document
        const doc = await getGoogleSheet(spreadsheetId);

        // Get or create the vocabulary report sheet
        const sheetName = 'Vocabulary-Report';
        let sheet = doc.sheetsByTitle[sheetName];

        if (!sheet) {
            // If sheet doesn't exist, create it
            sheet = await doc.addSheet({ title: sheetName });
            await sheet.setHeaderRow([
                'Language',
                'Level',
                'Word',
                'Meaning',
                'Correct',
                'Wrong',
                'TotalAttempts',
                'SuccessRate',
                'Status',
                'TotalCorrect',
                'OverallSuccessRate',
                'CompletedAt'
            ]);
        }

        // Prepare data for each word result
        const overallSuccessRate = totalAttempts > 0 ? ((totalCorrect / totalAttempts) * 100).toFixed(2) : '0';
        const reportData = Object.values(wordResults).map((result: any) => {
            const wordTotal = result.correct + result.wrong;
            const wordSuccessRate = wordTotal > 0 ? ((result.correct / wordTotal) * 100).toFixed(2) : '0';
            const status = result.wrong === 0 && result.correct > 0
                ? 'Mastered'
                : result.wrong > result.correct
                    ? 'Needs Practice'
                    : 'Learning';

            return {
                Language: language,
                Level: level,
                Word: result.word,
                Meaning: result.meaning,
                Correct: result.correct,
                Wrong: result.wrong,
                TotalAttempts: wordTotal,
                SuccessRate: wordSuccessRate,
                Status: status,
                TotalCorrect: totalCorrect,
                OverallSuccessRate: overallSuccessRate,
                CompletedAt: completedAt || new Date().toISOString()
            };
        });

        // Save to Google Sheets
        await appendSheetData(
            spreadsheetId,
            reportData,
            sheetName
        );

        return NextResponse.json({
            success: true,
            message: 'Vocabulary test results saved successfully',
            recordsSaved: reportData.length
        });
    } catch (error) {
        console.error('Error saving vocabulary report:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save vocabulary report' },
            { status: 500 }
        );
    }
}

