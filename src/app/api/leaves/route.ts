import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const leaveRequests = await db.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
        leaveType: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leaveRequests);
  } catch (error) {
    console.error('Leaves GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات الإجازة' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, leaveTypeId, startDate, endDate, totalDays, reason } = body;

    if (!employeeId || !leaveTypeId || !startDate || !endDate || !totalDays) {
      return NextResponse.json({ error: 'الحقول المطلوبة غير مكتملة' }, { status: 400 });
    }

    const leaveRequest = await db.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: parseInt(totalDays),
        reason: reason || null,
        status: 'pending',
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

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    console.error('Leaves POST error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء طلب الإجازة' }, { status: 500 });
  }
}
