import { NextResponse } from 'next/server';
import {
  getMemberById,
  getMemberSummary,
  updateMember,
  deactivateMember,
  getMemberAttendance,
  getMemberBills,
  getMemberPayments,
} from '@/app/badminton/lib/sheetHelpers';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/badminton/members/[id]
 * Get member detail with attendance, bills, and payments
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const member = await getMemberById(id);
    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member tidak ditemukan' },
        { status: 404 }
      );
    }

    const [summary, attendance, bills, payments] = await Promise.all([
      getMemberSummary(id),
      getMemberAttendance(id),
      getMemberBills(id),
      getMemberPayments(id),
    ]);

    return NextResponse.json({
      success: true,
      member: { ...member, summary },
      attendance,
      bills,
      payments,
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/badminton/members/[id]
 * Update member or deactivate
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, phoneNumber, isActive, action } = body;

    const existing = await getMemberById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Member tidak ditemukan' },
        { status: 404 }
      );
    }

    let member;
    if (action === 'deactivate') {
      member = await deactivateMember(id);
    } else {
      if (name !== undefined && !String(name).trim()) {
        return NextResponse.json(
          { success: false, error: 'Nama tidak boleh kosong' },
          { status: 400 }
        );
      }
      if (phoneNumber !== undefined && !String(phoneNumber).trim()) {
        return NextResponse.json(
          { success: false, error: 'Nomor HP tidak boleh kosong' },
          { status: 400 }
        );
      }
      member = await updateMember(id, {
        name: name !== undefined ? String(name).trim() : undefined,
        phoneNumber: phoneNumber !== undefined ? String(phoneNumber).trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      });
    }

    const summary = await getMemberSummary(id);

    return NextResponse.json({
      success: true,
      member: { ...member, summary },
    });
  } catch (error) {
    console.error('Error updating member:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
