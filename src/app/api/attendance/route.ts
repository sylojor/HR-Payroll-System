import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const departmentId = searchParams.get('departmentId');
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (departmentId) {
      where.employee = { departmentId };
    }

    const records = await db.attendanceRecord.findMany({
      where,
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
        device: {
          select: {
            name: true,
            deviceType: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'فشل في جلب سجلات الحضور' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut, status, note } = body;

    if (!employeeId || !date) {
      return NextResponse.json({ error: 'الحقول المطلوبة غير مكتملة' }, { status: 400 });
    }

    const dateObj = new Date(date);
    const checkInObj = checkIn ? new Date(checkIn) : null;
    const checkOutObj = checkOut ? new Date(checkOut) : null;

    let workHours: number | null = null;
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;

    if (checkInObj && checkOutObj) {
      const diffMs = checkOutObj.getTime() - checkInObj.getTime();
      workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      // Calculate late minutes (assuming 08:00 start)
      const checkInHour = checkInObj.getHours();
      const checkInMin = checkInObj.getMinutes();
      const totalCheckInMin = checkInHour * 60 + checkInMin;
      const standardStartMin = 8 * 60; // 08:00
      if (totalCheckInMin > standardStartMin + 15) {
        lateMinutes = totalCheckInMin - standardStartMin;
      }

      // Calculate early leave (assuming 17:00 end)
      const checkOutHour = checkOutObj.getHours();
      const checkOutMin = checkOutObj.getMinutes();
      const totalCheckOutMin = checkOutHour * 60 + checkOutMin;
      const standardEndMin = 17 * 60; // 17:00
      if (totalCheckOutMin < standardEndMin - 15) {
        earlyLeaveMinutes = standardEndMin - totalCheckOutMin;
      }
    }

    const record = await db.attendanceRecord.create({
      data: {
        employeeId,
        date: dateObj,
        checkIn: checkInObj,
        checkOut: checkOutObj,
        workHours,
        lateMinutes,
        earlyLeaveMinutes,
        status: status || 'present',
        note: note || null,
        isManual: true,
      },
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

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance:', error);
    return NextResponse.json({ error: 'فشل في إنشاء سجل الحضور' }, { status: 500 });
  }
}
