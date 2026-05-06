import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        department: true,
        position: true,
        workSchedule: true,
        salaryComponents: {
          include: { component: true },
          orderBy: { component: { type: 'asc' } },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    // Fetch attendance records (last 30)
    const attendanceRecords = await db.attendanceRecord.findMany({
      where: { employeeId: id },
      orderBy: { date: 'desc' },
      take: 30,
    });

    // Fetch leave requests with leaveType
    const leaveRequests = await db.leaveRequest.findMany({
      where: { employeeId: id },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch payroll items (last 12) with payroll relation
    const payrollItems = await db.payrollItem.findMany({
      where: { employeeId: id },
      include: { payroll: { select: { month: true, year: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return NextResponse.json({
      employee,
      attendanceRecords,
      leaveRequests,
      payrollItems,
    });
  } catch (error) {
    console.error('Employee details GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب تفاصيل الموظف' }, { status: 500 });
  }
}
