import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import crypto from 'crypto';

// Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

export async function getGoogleSheet(spreadsheetId: string) {
  const doc = new GoogleSpreadsheet(spreadsheetId, jwt);
  await doc.loadInfo();
  return doc;
}

export async function readSheetData(spreadsheetId: string, sheetName?: string) {
  try {
    const doc = await getGoogleSheet(spreadsheetId);
    let sheet = sheetName ? doc.sheetsByTitle[sheetName] : doc.sheetsByIndex[0];

    if (!sheet) {
      sheet = await doc.addSheet({ title: sheetName });
    }
    console.log(sheetName)
    const rows = await sheet.getRows();
    return rows.map(row => row.toObject());
  } catch (error) {
    console.error('Error reading from Google Sheet:', error);
    throw error;
  }
}

export async function appendSheetData(
  spreadsheetId: string,
  data: Record<string, any>[],
  sheetNameOrIndex?: string | number
) {
  try {
    const doc = await getGoogleSheet(spreadsheetId);
    let sheet;
    if (typeof sheetNameOrIndex === 'string') {
      sheet = doc.sheetsByTitle[sheetNameOrIndex];
      if (!sheet && data.length > 0) {
        const headers = Object.keys(data[0]);
        sheet = await doc.addSheet({ title: sheetNameOrIndex, headerValues: headers });
      }
    } else {
      sheet = doc.sheetsByIndex[sheetNameOrIndex ?? 0];
    }
    if (!sheet) throw new Error('Sheet not found');
    await sheet.addRows(data);
    return { success: true, message: 'Data added successfully' };
  } catch (error) {
    console.error('Error writing to Google Sheet:', error);
    throw error;
  }
}

export async function updateSheetData(
  spreadsheetId: string,
  rowIndex: number,
  data: Record<string, any>,
  sheetIndex = 0
) {
  try {
    const doc = await getGoogleSheet(spreadsheetId);
    const sheet = doc.sheetsByIndex[sheetIndex];
    const rows = await sheet.getRows();

    if (rowIndex >= rows.length) {
      throw new Error('Row index out of bounds');
    }

    const row = rows[rowIndex];
    Object.entries(data).forEach(([key, value]) => {
      (row as any)[key] = value;
    });
    await row.save();

    return { success: true, message: 'Row updated successfully' };
  } catch (error) {
    console.error('Error updating Google Sheet:', error);
    throw error;
  }
}

// New helpers for id-based CRUD on a named sheet
export async function ensureSheetWithHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
) {
  const doc = await getGoogleSheet(spreadsheetId);
  let sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) {
    sheet = await doc.addSheet({ title: sheetName, headerValues: headers });
  } else {
    // Ensure headers contain required ones
    const currentHeaders = sheet.headerValues || [];
    const missing = headers.filter((h) => !currentHeaders.includes(h));
    if (missing.length > 0) {
      // sheet.headerValues = [...currentHeaders, ...missing];
      await sheet.saveUpdatedCells();
    }
  }
  return sheet;
}

export async function listRowsBySheet(
  spreadsheetId: string,
  sheetName: string
) {
  const doc = await getGoogleSheet(spreadsheetId);
  const sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) return [];
  const rows = await sheet.getRows();
  return rows.map((r) => r.toObject());
}

export async function createRowWithId(
  spreadsheetId: string,
  sheetName: string,
  data: Record<string, any>
) {
  const id = crypto.randomUUID();
  const sheet = await ensureSheetWithHeaders(spreadsheetId, sheetName, ['id']);
  await sheet.addRow({ id, ...data });
  return { id };
}

export async function findRowIndexById(
  spreadsheetId: string,
  sheetName: string,
  id: string
) {
  const doc = await getGoogleSheet(spreadsheetId);
  const sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) return -1;
  const rows = await sheet.getRows();
  const idx = rows.findIndex((r: any) => (r as any)['id'] === id);
  return idx;
}

export async function readRowById(
  spreadsheetId: string,
  sheetName: string,
  id: string
) {
  const doc = await getGoogleSheet(spreadsheetId);
  const sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) return null;
  const rows = await sheet.getRows();
  const row = rows.find((r: any) => (r as any)['id'] === id);
  return row ? (row as any).toObject() : null;
}

export async function updateRowById(
  spreadsheetId: string,
  sheetName: string,
  id: string,
  data: Record<string, any>
) {
  const doc = await getGoogleSheet(spreadsheetId);
  const sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) throw new Error('Sheet not found');
  const rows = await sheet.getRows();
  const row = rows.find((r: any) => (r as any)['id'] === id);
  if (!row) throw new Error('Row not found');
  Object.entries(data).forEach(([k, v]) => ((row as any)[k] = v));
  await row.save();
  return { success: true };
}

export async function deleteRowById(
  spreadsheetId: string,
  sheetName: string,
  id: string
) {
  const doc = await getGoogleSheet(spreadsheetId);
  const sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) throw new Error('Sheet not found');
  const rows = await sheet.getRows();
  const row = rows.find((r: any) => (r as any)['id'] === id);
  if (!row) throw new Error('Row not found');
  await row.delete();
  return { success: true };
}