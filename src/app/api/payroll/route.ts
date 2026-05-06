import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const payroll = await db.payroll.findUnique({
      where: { month_year: { month, year } },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
                position: { select: { title: true } },
              },
            },
          },
          orderBy: { employee: { employeeId: 'asc' } },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json({ payroll: null, summary: null });
    }

    const summary = {
      totalEarnings: payroll.totalEarnings,
      totalDeductions: payroll.totalDeductions,
      totalNet: payroll.totalNet,
      employeeCount: payroll.items.length,
      paidCount: payroll.items.filter(i => i.status === 'paid').length,
      pendingCount: payroll.items.filter(i => i.status === 'pending').length,
    };

    return NextResponse.json({ payroll, summary });
  } catch (error) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الرواتب' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const month = parseInt(body.month);
    const year = parseInt(body.year);

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json({ error: 'شهر أو سنة غير صالحة' }, { status: 400 });
    }

    // Check if payroll already exists
    const existing = await db.payroll.findUnique({
      where: { month_year: { month, year } },
    });

    if (existing) {
      return NextResponse.json({ error: 'تم معالجة كشف الرواتب لهذا الشهر مسبقاً' }, { status: 400 });
    }

    // Get all active employees with their salary components
    const employees = await db.employee.findMany({
      where: { status: 'active' },
      include: {
        salaryComponents: {
          include: { component: true },
          where: {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
        },
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'لا يوجد موظفين نشطين' }, { status: 400 });
    }

    let totalEarnings = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const itemsData: {
      employeeId: string;
      basicSalary: number;
      totalEarnings: number;
      totalDeductions: number;
      netSalary: number;
      overtimePay: number;
      lateDeduction: number;
      absenceDeduction: number;
      loanDeduction: number;
      taxAmount: number;
      socialSecurity: number;
      details: string;
      status: string;
    }[] = [];

    for (const emp of employees) {
      let basicSalary = 0;
      let empEarnings = 0;
      let empDeductions = 0;
      let overtimePay = 0;
      let lateDeduction = 0;
      let absenceDeduction = 0;
      let loanDeduction = 0;
      let taxAmount = 0;
      let socialSecurity = 0;

      const detailsArr: { name: string; type: string; amount: number }[] = [];

      for (const sc of emp.salaryComponents) {
        const amount = sc.amount || 0;
        detailsArr.push({
          name: sc.component.name,
          type: sc.component.type,
          amount,
        });

        if (sc.component.type === 'earning') {
          empEarnings += amount;
          if (sc.component.category === 'basic') {
            basicSalary = amount;
          }
          if (sc.component.category === 'overtime') {
            overtimePay += amount;
          }
        } else if (sc.component.type === 'deduction') {
          empDeductions += amount;
          if (sc.component.category === 'attendance' && sc.component.nameEn?.includes('Late')) {
            lateDeduction += amount;
          }
          if (sc.component.category === 'attendance' && sc.component.nameEn?.includes('Absence')) {
            absenceDeduction += amount;
          }
          if (sc.component.category === 'tax') {
            taxAmount += amount;
          }
          if (sc.component.category === 'insurance') {
            socialSecurity += amount;
          }
          if (sc.component.category === 'loan') {
            loanDeduction += amount;
          }
        }
      }

      // Calculate social security (7% of basic) if not already set
      if (socialSecurity === 0 && basicSalary > 0) {
        socialSecurity = Math.round(basicSalary * 0.07 * 100) / 100;
        empDeductions += socialSecurity;
        detailsArr.push({
          name: 'الضمان الاجتماعي',
          type: 'deduction',
          amount: socialSecurity,
        });
      }

      // Calculate tax (5% of taxable earnings above 1000 JOD threshold)
      const taxableEarnings = emp.salaryComponents
        .filter(sc => sc.component.type === 'earning' && sc.component.isTaxable)
        .reduce((sum, sc) => sum + (sc.amount || 0), 0);

      if (taxAmount === 0 && taxableEarnings > 1000) {
        taxAmount = Math.round((taxableEarnings - 1000) * 0.05 * 100) / 100;
        empDeductions += taxAmount;
        detailsArr.push({
          name: 'ضريبة الدخل',
          type: 'deduction',
          amount: taxAmount,
        });
      }

      const netSalary = Math.round((empEarnings - empDeductions) * 100) / 100;

      totalEarnings += empEarnings;
      totalDeductions += empDeductions;
      totalNet += netSalary;

      itemsData.push({
        employeeId: emp.id,
        basicSalary,
        totalEarnings: Math.round(empEarnings * 100) / 100,
        totalDeductions: Math.round(empDeductions * 100) / 100,
        netSalary,
        overtimePay,
        lateDeduction,
        absenceDeduction,
        loanDeduction,
        taxAmount,
        socialSecurity,
        details: JSON.stringify(detailsArr),
        status: 'pending',
      });
    }

    // Create payroll with items
    const payroll = await db.payroll.create({
      data: {
        month,
        year,
        status: 'draft',
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        processedAt: new Date(),
        items: {
          create: itemsData,
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
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ payroll });
  } catch (error) {
    console.error('Payroll POST error:', error);
    return NextResponse.json({ error: 'فشل في معالجة الرواتب' }, { status: 500 });
  }
}
