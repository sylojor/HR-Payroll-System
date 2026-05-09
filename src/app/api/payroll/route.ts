import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface GeneratePayrollBody {
  month: number
  year: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (month && year) {
      where.month = parseInt(month, 10)
      where.year = parseInt(year, 10)
    }

    if (status) {
      where.status = status
    }

    const payrolls = await db.payroll.findMany({
      where,
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                firstNameAr: true,
                lastNameAr: true,
                department: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json({ payrolls })
  } catch (error) {
    console.error('Payroll list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch payroll'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePayrollBody = await request.json()

    if (!body.month || !body.year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      )
    }

    // Check if payroll already exists for this month/year
    const existingPayroll = await db.payroll.findUnique({
      where: {
        month_year: {
          month: body.month,
          year: body.year,
        },
      },
    })

    if (existingPayroll) {
      return NextResponse.json(
        { error: 'Payroll already exists for this month. Delete it first to regenerate.' },
        { status: 409 }
      )
    }

    // Get all active employees
    const employees = await db.employee.findMany({
      where: { status: 'ACTIVE' },
    })

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'No active employees found' },
        { status: 400 }
      )
    }

    // Get salary components
    const salaryComponents = await db.salaryComponent.findMany({
      where: { isActive: true },
    })

    // Get attendance for the month
    const monthStart = new Date(body.year, body.month - 1, 1)
    const monthEnd = new Date(body.year, body.month, 0)

    let totalGross = 0
    let totalDeductions = 0
    let totalNet = 0

    const payrollItemsData: {
      employeeId: string
      basicSalary: number
      totalAllowances: number
      totalDeductions: number
      grossSalary: number
      taxAmount: number
      netSalary: number
      daysWorked: number
      overtimeHours: number
      overtimeAmount: number
      details: string
    }[] = []

    for (const emp of employees) {
      const basicSalary = emp.salary
      let empTotalAllowances = 0
      let empTotalDeductions = 0

      const breakdownItems: { name: string; nameAr: string; type: string; amount: number }[] = []

      for (const comp of salaryComponents) {
        let amount = 0
        if (comp.isFixed) {
          amount = comp.amount
        } else if (comp.percentage > 0) {
          amount = Math.round(basicSalary * comp.percentage / 100 * 100) / 100
        }

        if (comp.type === 'ALLOWANCE') {
          empTotalAllowances += amount
          breakdownItems.push({ name: comp.name, nameAr: comp.nameAr, type: 'ALLOWANCE', amount })
        } else {
          empTotalDeductions += amount
          breakdownItems.push({ name: comp.name, nameAr: comp.nameAr, type: 'DEDUCTION', amount })
        }
      }

      const grossSalary = basicSalary + empTotalAllowances
      const taxAmount = Math.round(basicSalary * 0.05 * 100) / 100
      const netSalary = Math.round((grossSalary - empTotalDeductions) * 100) / 100

      // Get attendance data
      const attendanceRecords = await db.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: monthStart, lte: monthEnd },
          status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] },
        },
      })

      const daysWorked = attendanceRecords.length
      const overtimeHrs = attendanceRecords.reduce((sum, a) => sum + a.overtimeHours, 0)
      const overtimeAmt = Math.round(overtimeHrs * (basicSalary / 30 / 8) * 1.5 * 100) / 100

      totalGross += grossSalary
      totalDeductions += empTotalDeductions
      totalNet += netSalary

      payrollItemsData.push({
        employeeId: emp.id,
        basicSalary,
        totalAllowances: empTotalAllowances,
        totalDeductions: empTotalDeductions,
        grossSalary,
        taxAmount,
        netSalary,
        daysWorked,
        overtimeHours: overtimeHrs,
        overtimeAmount: overtimeAmt,
        details: JSON.stringify(breakdownItems),
      })
    }

    // Create payroll with items
    const payroll = await db.payroll.create({
      data: {
        month: body.month,
        year: body.year,
        status: 'DRAFT',
        totalGross: Math.round(totalGross * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        notes: `Payroll for ${body.month}/${body.year}`,
        items: {
          create: payrollItemsData,
        },
      },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                department: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ payroll }, { status: 201 })
  } catch (error) {
    console.error('Generate payroll error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate payroll'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
