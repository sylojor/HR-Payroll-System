import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Basic counts
    const totalEmployees = await db.employee.count({ where: { status: 'active' } });
    const totalDepartments = await db.department.count();
    const totalDevices = await db.fingerprintDevice.count();
    const onlineDevices = await db.fingerprintDevice.count({ where: { status: 'online' } });

    // Attendance stats for current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const attendanceRecords = await db.attendanceRecord.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    const totalPresent = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
    const totalLate = attendanceRecords.filter(r => r.status === 'late').length;
    const avgWorkHours = attendanceRecords.length > 0
      ? attendanceRecords.reduce((sum, r) => sum + (r.workHours || 0), 0) / attendanceRecords.filter(r => r.workHours).length
      : 0;

    // Leave requests
    const pendingLeaves = await db.leaveRequest.count({ where: { status: 'pending' } });
    const approvedLeaves = await db.leaveRequest.count({ where: { status: 'approved' } });

    // Salary totals
    const salaryComponents = await db.employeeSalaryComponent.findMany({
      where: { component: { type: 'earning', category: 'basic' } },
      include: { component: true },
    });
    const totalBasicSalaries = salaryComponents.reduce((sum, sc) => sum + sc.amount, 0);

    // Department distribution
    const departments = await db.department.findMany({
      include: {
        _count: { select: { employees: { where: { status: 'active' } } } },
      },
    });

    // Daily attendance for last 7 days
    const dailyAttendance = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

      const dayRecords = await db.attendanceRecord.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
      });

      dailyAttendance.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('ar-JO', { weekday: 'short' }),
        present: dayRecords.filter(r => r.status === 'present').length,
        late: dayRecords.filter(r => r.status === 'late').length,
        absent: dayRecords.filter(r => r.status === 'absent').length,
      });
    }

    // Recent notifications
    const recentNotifications = await db.notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // Recent leave requests
    const recentLeaves = await db.leaveRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeId: true } },
        leaveType: { select: { name: true } },
      },
    });

    // Fingerprint devices status
    const devices = await db.fingerprintDevice.findMany({
      select: { id: true, name: true, deviceType: true, status: true, lastSync: true, location: true },
    });

    // Employees by gender
    const maleCount = await db.employee.count({ where: { gender: 'male', status: 'active' } });
    const femaleCount = await db.employee.count({ where: { gender: 'female', status: 'active' } });

    return NextResponse.json({
      totalEmployees,
      totalDepartments,
      totalDevices,
      onlineDevices,
      attendance: {
        totalPresent,
        totalAbsent,
        totalLate,
        avgWorkHours: Math.round(avgWorkHours * 100) / 100,
        attendanceRate: totalPresent + totalAbsent > 0 ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) : 0,
      },
      leaves: { pending: pendingLeaves, approved: approvedLeaves },
      totalBasicSalaries: Math.round(totalBasicSalaries * 100) / 100,
      departments: departments.map(d => ({ name: d.name, count: d._count.employees })),
      dailyAttendance,
      recentNotifications,
      recentLeaves: recentLeaves.map(l => ({
        id: l.id,
        employee: `${l.employee.firstName} ${l.employee.lastName}`,
        type: l.leaveType.name,
        startDate: l.startDate,
        endDate: l.endDate,
        totalDays: l.totalDays,
        status: l.status,
      })),
      devices,
      gender: { male: maleCount, female: femaleCount },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
