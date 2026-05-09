import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [totalEmployees, activeEmployees, departmentsCount, pendingLeaves] = await Promise.all([
      db.employee.count(),
      db.employee.count({ where: { status: 'ACTIVE' } }),
      db.department.count(),
      db.leave.count({ where: { status: 'PENDING' } }),
    ])

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const [presentToday, absentToday, onLeaveToday] = await Promise.all([
      db.attendance.count({ where: { date: { gte: todayStart }, status: { in: ['PRESENT', 'LATE'] } } }),
      db.attendance.count({ where: { date: { gte: todayStart }, status: 'ABSENT' } }),
      db.attendance.count({ where: { date: { gte: todayStart }, status: 'LEAVE' } }),
    ])

    const currentPayroll = await db.payroll.findFirst({
      where: { month: today.getMonth() + 1, year: today.getFullYear() },
    })

    const departments = await db.department.findMany({
      include: { _count: { select: { employees: true } } },
    })

    const licenses = await db.license.findMany()

    return NextResponse.json({
      totalEmployees,
      activeEmployees,
      departmentsCount,
      presentToday,
      absentToday,
      onLeaveToday,
      pendingLeaves,
      payrollSummary: currentPayroll ? {
        totalGross: currentPayroll.totalGross,
        totalDeductions: currentPayroll.totalDeductions,
        totalNet: currentPayroll.totalNet,
      } : null,
      departmentDist: departments.map(d => ({ name: d.name, nameAr: d.nameAr, value: d._count.employees })),
      attendanceChart: [
        { name: 'Sun', present: Math.floor(activeEmployees * 0.85), absent: Math.floor(activeEmployees * 0.1) },
        { name: 'Mon', present: Math.floor(activeEmployees * 0.9), absent: Math.floor(activeEmployees * 0.05) },
        { name: 'Tue', present: Math.floor(activeEmployees * 0.88), absent: Math.floor(activeEmployees * 0.07) },
        { name: 'Wed', present: Math.floor(activeEmployees * 0.92), absent: Math.floor(activeEmployees * 0.03) },
        { name: 'Thu', present: Math.floor(activeEmployees * 0.87), absent: Math.floor(activeEmployees * 0.08) },
      ],
      payrollTrend: [{ month: today.toLocaleDateString('en', { month: 'short' }), amount: currentPayroll?.totalNet ?? 0 }],
      licenseStatus: {
        fingerprint: { active: licenses.some(l => l.module === 'FINGERPRINT' && l.isActive), maxDevices: 3, activatedDevices: 3 },
        hr: { active: licenses.some(l => l.module === 'HR' && l.isActive), expiresAt: null },
        payroll: { active: licenses.some(l => l.module === 'PAYROLL' && l.isActive), expiresAt: null },
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
