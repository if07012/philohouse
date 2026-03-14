import { NextResponse } from 'next/server';
import { getGoogleSheet } from '../../../../lib/googleSheets';
import { GOOGLE_SHEET_ID } from '../../../../order/data/cookies';

function formatDateForSheet(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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

    const { markGenerated, markSent } = body;

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

    const now = formatDateForSheet();
    if (markGenerated === true) {
      orderRow.set('Invoice Generated', now);
    }
    if (markSent === true) {
      orderRow.set('Invoice Sent', now);
    }
    await orderRow.save();

    return NextResponse.json({
      success: true,
      message: 'Invoice status updated',
      invoiceGenerated: markGenerated ? now : orderRow.get('Invoice Generated'),
      invoiceSent: markSent ? now : orderRow.get('Invoice Sent'),
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice status' },
      { status: 500 }
    );
  }
}
