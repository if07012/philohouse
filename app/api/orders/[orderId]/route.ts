import { NextResponse } from 'next/server';
import { readSheetData, getGoogleSheet } from '../../../lib/googleSheets';
import { GOOGLE_SHEET_ID, buildSheetRow, buildCookieDetailRows, getSpinChances } from '../../../order/data/cookies';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { error: 'Google Sheet ID not configured' },
        { status: 500 }
      );
    }

    // Read orders from the Orders sheet
    const orders = await readSheetData(GOOGLE_SHEET_ID, 'Orders');
    
    // Find order by Order ID
    const order = orders.find((o: any) => o['Order ID'] === orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Read cookie details
    const cookieDetails = await readSheetData(GOOGLE_SHEET_ID, 'Cookie Details');
    const orderCookieDetails = cookieDetails.filter((c: any) => c['Order ID'] === orderId);

    return NextResponse.json({
      order,
      cookieDetails: orderCookieDetails,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { error: 'Google Sheet ID not configured' },
        { status: 500 }
      );
    }

    const doc = await getGoogleSheet(GOOGLE_SHEET_ID);
    const ordersSheet = doc.sheetsByTitle['Orders'];
    const cookieDetailsSheet = doc.sheetsByTitle['Cookie Details'];

    if (!ordersSheet) {
      return NextResponse.json(
        { error: 'Orders sheet not found' },
        { status: 404 }
      );
    }

    // Find the order row
    const orderRows = await ordersSheet.getRows();
    const orderRowIndex = orderRows.findIndex((r: any) => r.get('Order ID') === orderId);

    if (orderRowIndex === -1) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order row (preserve spin fields when editing)
    const orderRow = orderRows[orderRowIndex];
    const existingSpinsUsed = orderRow.get('Spins Used');
    const existingSpinCompleted = orderRow.get('Spin Completed');
    const existingEligibleForGift = orderRow.get('Eligible for Gift');
    const spinFields = {
      eligibleForGift: existingEligibleForGift ?? (getSpinChances(body.orderData.total) >= 1 ? 'Ya' : 'Tidak'),
      spinsUsed: typeof existingSpinsUsed === 'number' ? existingSpinsUsed : (Number(existingSpinsUsed) || 0),
      spinCompleted: ['Ya', 'Tidak', 'Skipped'].includes(String(existingSpinCompleted)) ? String(existingSpinCompleted) : 'Tidak',
    };
    const updatedOrderRow = buildSheetRow(body.orderData, spinFields);
    
    Object.entries(updatedOrderRow).forEach(([key, value]) => {
      orderRow.set(key, value);
    });
    await orderRow.save();

    // Update cookie details - delete old ones and add new ones
    if (cookieDetailsSheet) {
      const cookieRows = await cookieDetailsSheet.getRows();
      const rowsToDelete = cookieRows.filter((r: any) => r.get('Order ID') === orderId);
      
      // Delete old cookie detail rows (in reverse order to maintain indices)
      for (let i = rowsToDelete.length - 1; i >= 0; i--) {
        await rowsToDelete[i].delete();
      }

      // Add new cookie detail rows
      const newCookieRows = buildCookieDetailRows({
        orderId: body.orderData.orderId,
        customer: { name: body.orderData.customer.name },
        items: body.orderData.items,
      });
      
      await cookieDetailsSheet.addRows(newCookieRows);
    }

    return NextResponse.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { error: 'Google Sheet ID not configured' },
        { status: 500 }
      );
    }

    const { spinsUsed, spinCompleted } = body;
    if (typeof spinsUsed !== 'number' || !['Ya', 'Tidak', 'Skipped'].includes(spinCompleted)) {
      return NextResponse.json(
        { error: 'spinsUsed (number) and spinCompleted (Ya|Tidak|Skipped) are required' },
        { status: 400 }
      );
    }

    const doc = await getGoogleSheet(GOOGLE_SHEET_ID);
    const ordersSheet = doc.sheetsByTitle['Orders'];

    if (!ordersSheet) {
      return NextResponse.json(
        { error: 'Orders sheet not found' },
        { status: 404 }
      );
    }

    const orderRows = await ordersSheet.getRows();
    const orderRow = orderRows.find((r: any) => r.get('Order ID') === orderId);

    if (!orderRow) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    orderRow.set('Spins Used', spinsUsed);
    orderRow.set('Spin Completed', spinCompleted);
    await orderRow.save();

    return NextResponse.json({ success: true, message: 'Spin status updated' });
  } catch (error) {
    console.error('Error updating spin status:', error);
    return NextResponse.json(
      { error: 'Failed to update spin status' },
      { status: 500 }
    );
  }
}
