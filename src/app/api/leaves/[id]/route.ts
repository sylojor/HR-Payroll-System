import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'الحالة غير صالحة' }, { status: 400 });
    }

    const leaveRequest = await db.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedAt: new Date(),
        rejectionReason: status === 'rejected' ? rejectionReason || null : null,
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
        leaveType: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error('Leave PUT error:', error);
    return NextResponse.json({ error: 'فشل في تحديث طلب الإجازة' }, { status: 500 });
  }
}
