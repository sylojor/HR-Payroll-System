import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, nameEn, defaultDays, isPaid, requiresApproval, carryForward } = body;

    const leaveType = await db.leaveType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(defaultDays !== undefined && { defaultDays: parseInt(defaultDays) }),
        ...(isPaid !== undefined && { isPaid }),
        ...(requiresApproval !== undefined && { requiresApproval }),
        ...(carryForward !== undefined && { carryForward }),
      },
    });

    return NextResponse.json(leaveType);
  } catch (error) {
    console.error('Leave Type PUT error:', error);
    return NextResponse.json({ error: 'فشل في تحديث نوع الإجازة' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.leaveType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave Type DELETE error:', error);
    return NextResponse.json({ error: 'فشل في حذف نوع الإجازة' }, { status: 500 });
  }
}
