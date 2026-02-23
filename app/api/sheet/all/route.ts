import { NextResponse } from 'next/server';
import { getGoogleSheet } from '@/app/lib/googleSheets';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const group = searchParams.get('group');

        if (!group) {
            return NextResponse.json({ error: 'Group parameter is required' }, { status: 400 });
        }

        // Get the spreadsheet ID from environment variable
        const spreadsheetId = process.env.QUESTIONS_SHEET_ID || process.env.QUIZ_SHEET_ID;

        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Sheet ID not configured' }, { status: 500 });
        }

        // Get all sheets from the spreadsheet
        const doc = await getGoogleSheet(spreadsheetId);

        // Filter sheets that match the group (e.g., English-*, Math-*)
        const matchingSheets = doc.sheetsByIndex
            .filter(sheet => sheet.title.startsWith(`${group}-`))
            .map(sheet => {
                const sheetTitle = sheet.title;
                // Extract level name by removing the group prefix
                const levelName = sheetTitle.replace(`${group}-`, '');
                return {
                    level: sheetTitle,
                    levelName: levelName,
                    isPass: false // Will be updated below
                };
            });

        // Check pass status from Vocabulary-Level-Summary sheet for vocabulary groups
        try {
            const summarySheet = doc.sheetsByTitle['Vocabulary-Level-Summary'];
            if (summarySheet) {
                const { readSheetData } = await import('@/app/lib/googleSheets');
                const summaryData = await readSheetData(spreadsheetId, 'Vocabulary-Level-Summary');

                // Extract language from group (e.g., vocab-english -> english)
                const language = group.replace('vocab-', '');

                // Create a map of level -> isPass status
                const levelStatusMap = new Map<string, boolean>();

                // Get the most recent pass status for each level
                const relevantEntries = summaryData
                    .filter((entry: any) =>
                        (entry.Language || entry.language)?.toLowerCase() === language.toLowerCase()
                    )
                    .sort((a: any, b: any) => {
                        const dateA = new Date(a.CompletedAt || a.completedAt || 0);
                        const dateB = new Date(b.CompletedAt || b.completedAt || 0);
                        return dateB.getTime() - dateA.getTime();
                    });

                relevantEntries.forEach((entry: any) => {
                    const level = entry.Level || entry.level;
                    // Check if IsPass is true (handle both string 'true' and boolean true)
                    const isPassValue = entry.IsPass || entry.isPass;
                    const isPass = isPassValue === 'TRUE' || isPassValue === true || isPassValue === 1 || isPassValue === '1';

                    // Only set if not already in map (to keep most recent)
                    if (level && !levelStatusMap.has(level) && isPass) {
                        levelStatusMap.set(level, isPass);
                    }
                });

                // Update matching sheets with pass status
                matchingSheets.forEach(sheet => {
                    const levelName = sheet.levelName;
                    if (levelName && levelStatusMap.has(levelName)) {
                        const isPassStatus = levelStatusMap.get(levelName);
                        sheet.isPass = isPassStatus === true;
                    }
                });
            }
        } catch (error) {
            console.error('Error checking level pass status:', error);
            // Continue with default isPass: false
        }

        return NextResponse.json(matchingSheets);
    } catch (error) {
        console.error('Error fetching sheets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sheets' },
            { status: 500 }
        );
    }
}

