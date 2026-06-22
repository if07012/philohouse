import { NextResponse } from 'next/server';
import {
  listMembersWithSummary,
  createMember,
} from '@/app/badminton/lib/sheetHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badminton/members
 * List all members with summary stats
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let members = await listMembersWithSummary();

    if (activeOnly) {
      members = members.filter((m) => m.isActive);
    }

    if (search) {
      members = members.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.phoneNumber.toLowerCase().includes(search)
      );
    }

    members.sort((a, b) => a.name.localeCompare(b.name, 'id'));

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Error fetching members:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, members: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/badminton/members
 * Add a new member
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phoneNumber, isActive, createdDate } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama wajib diisi' },
        { status: 400 }
      );
    }

    if (!phoneNumber?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor HP wajib diisi' },
        { status: 400 }
      );
    }

    const member = await createMember({
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      isActive: isActive !== false,
      createdDate: createdDate || undefined,
    });

    return NextResponse.json({
      success: true,
      member: {
        ...member,
        summary: {
          attendanceCount: 0,
          totalBills: 0,
          totalPayments: 0,
          outstandingAmount: 0,
        },
      },
    });
  } catch (error) {
    console.error('Error creating member:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
