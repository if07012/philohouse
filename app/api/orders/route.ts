import { NextResponse } from 'next/server';
import { readSheetData } from '../../lib/googleSheets';
import { GOOGLE_SHEET_ID } from '../../order/data/cookies';

export async function GET(request: Request) {
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

    // Read spin rewards (gifts)
    let giftsByOrderId: Record<string, string[]> = {};
    try {
      const spinRows = await readSheetData(GOOGLE_SHEET_ID, 'Spin Rewards');
      spinRows.forEach((r: any) => {
        const orderId = r['Order ID'];
        const gift = r['Gift'] || r.Gift;
        if (orderId && gift) {
          if (!giftsByOrderId[orderId]) giftsByOrderId[orderId] = [];
          giftsByOrderId[orderId].push(String(gift));
        }
      });
    } catch (err) {
      console.error('Could not read Spin Rewards sheet:', err);
    }

    // Group cookie details by Order ID
    const cookieDetailsByOrderId: Record<string, any[]> = {};
    cookieDetails.forEach((detail: any) => {
      const orderId = detail['Order ID'];
      if (!cookieDetailsByOrderId[orderId]) {
        cookieDetailsByOrderId[orderId] = [];
      }
      cookieDetailsByOrderId[orderId].push(detail);
    });

    // Combine orders with their cookie details and gifts
    const ordersWithDetails = orders.map((order: any) => ({
      ...order,
      cookieDetails: cookieDetailsByOrderId[order['Order ID']] || [],
      gifts: giftsByOrderId[order['Order ID']] || [],
    }));

    // If request contains role/sales header, apply Sales filtering
    try {
      const role = request.headers.get('x-orders-role') || '';
      const salesId = request.headers.get('x-orders-sales') || '';
      if (role === 'sales' && salesId) {
        // Filter orders where the Sales field (or customer.sales) matches the salesId
        const filtered = ordersWithDetails.filter((order: any) => {
          const salesField = (
            order['Sales'] || order.Sales || (order.customer && order.customer.sales) || ''
          ).toString();
          return salesField === salesId;
        });
        // replace ordersWithDetails with filtered result
        // also preserve sorting below
        // reassign variable by mutating array reference
        ordersWithDetails.length = 0;
        filtered.forEach((o: any) => ordersWithDetails.push(o));
      }
    } catch (e) {
      // ignore header parsing errors and continue without filtering
      console.error('Error applying sales filter:', e);
    }

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
