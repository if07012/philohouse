import { NextResponse } from 'next/server';
import { readSheetData } from '../../lib/googleSheets';
import { GOOGLE_SHEET_ID } from '../../order/data/cookies';

export async function GET() {
  try {
    if (!GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { error: 'Google Sheet ID not configured' },
        { status: 500 }
      );
    }

    // Read orders from the Orders sheet
    const orders = await readSheetData(GOOGLE_SHEET_ID, 'Orders');
    
    // Read cookie details
    const cookieDetails = await readSheetData(GOOGLE_SHEET_ID, 'Cookie Details');

    // Group cookie details by Order ID
    const cookieDetailsByOrderId: Record<string, any[]> = {};
    cookieDetails.forEach((detail: any) => {
      const orderId = detail['Order ID'];
      if (!cookieDetailsByOrderId[orderId]) {
        cookieDetailsByOrderId[orderId] = [];
      }
      cookieDetailsByOrderId[orderId].push(detail);
    });

    // Combine orders with their cookie details
    const ordersWithDetails = orders.map((order: any) => ({
      ...order,
      cookieDetails: cookieDetailsByOrderId[order['Order ID']] || [],
    }));

    // Sort by Order Date descending (newest first)
    ordersWithDetails.sort((a: any, b: any) => {
      // Parse dates (format: DD/MM/YYYY)
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };
      return parseDate(b['Order Date']).getTime() - parseDate(a['Order Date']).getTime();
    });

    return NextResponse.json({ orders: ordersWithDetails });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
