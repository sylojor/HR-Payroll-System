import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { checkIn, checkOut, status, note, lateMinutes, earlyLeaveMinutes } = body;

    const updateData: Record<string, unknown> = {};

    if (checkIn !== undefined) updateData.checkIn = checkIn ? new Date(checkIn) : null;
    if (checkOut !== undefined) updateData.checkOut = checkOut ? new Date(checkOut) : null;
    if (status !== undefined) updateData.status = status;
    if (note !== undefined) updateData.note = note;
    if (lateMinutes !== undefined) updateData.lateMinutes = lateMinutes;
    if (earlyLeaveMinutes !== undefined) updateData.earlyLeaveMinutes = earlyLeaveMinutes;

    if (updateData.checkIn && updateData.checkOut) {
      const diffMs = new Date(updateData.checkOut as string).getTime() - new Date(updateData.checkIn as string).getTime();
      updateData.workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }

    const record = await db.attendanceRecord.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: {
              select: { name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'فشل في تحديث سجل الحضور' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.attendanceRecord.delete({ where: { id } });
    return NextResponse.json({ message: 'تم حذف سجل الحضور بنجاح' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return NextResponse.json({ error: 'فشل في حذف سجل الحضور' }, { status: 500 });
  }
}
