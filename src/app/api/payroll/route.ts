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

    // Get all active employees (salary fields are directly on Employee model)
    const employees = await db.employee.findMany({
      where: { status: 'active' },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'لا يوجد موظفين نشطين' }, { status: 400 });
    }

    // Build date range for the given month/year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // first day of next month

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
      const detailsArr: { name: string; type: string; amount: number }[] = [];

      // ===== 1. Read salary components directly from Employee model =====
      const basicSalary = emp.basicSalary || 0;
      const housingAllowance = emp.housingAllowance || 0;
      const transportAllowance = emp.transportAllowance || 0;
      const foodAllowance = emp.foodAllowance || 0;
      const otherAllowances = emp.otherAllowances || 0;

      // Add earnings details
      detailsArr.push({ name: 'الراتب الأساسي', type: 'earning', amount: basicSalary });
      if (housingAllowance > 0) {
        detailsArr.push({ name: 'بدل سكن', type: 'earning', amount: housingAllowance });
      }
      if (transportAllowance > 0) {
        detailsArr.push({ name: 'بدل نقل', type: 'earning', amount: transportAllowance });
      }
      if (foodAllowance > 0) {
        detailsArr.push({ name: 'بدل طعام', type: 'earning', amount: foodAllowance });
      }
      if (otherAllowances > 0) {
        detailsArr.push({ name: 'بدلات أخرى', type: 'earning', amount: otherAllowances });
      }

      // ===== 2. Calculate overtime pay from attendance records =====
      const attendanceRecords = await db.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      // Sum overtime hours
      const totalOvertimeHours = attendanceRecords.reduce(
        (sum, rec) => sum + (rec.overtimeHours || 0),
        0
      );

      // Cap overtime at maxOvertimeHours if set
      let cappedOvertimeHours = totalOvertimeHours;
      if (emp.maxOvertimeHours > 0 && totalOvertimeHours > emp.maxOvertimeHours) {
        cappedOvertimeHours = emp.maxOvertimeHours;
      }

      // Calculate overtime pay
      let overtimePay = 0;
      if (cappedOvertimeHours > 0) {
        if (emp.overtimeHourPrice > 0) {
          overtimePay = emp.overtimeHourPrice * cappedOvertimeHours;
        } else {
          // (basicSalary / 30 / 8) * overtimeRate * totalOvertimeHours
          overtimePay = (basicSalary / 30 / 8) * (emp.overtimeRate || 1.5) * cappedOvertimeHours;
        }
        overtimePay = Math.round(overtimePay * 100) / 100;
        detailsArr.push({ name: 'بدل إضافي', type: 'earning', amount: overtimePay });
      }

      // ===== 3. Calculate late deductions from attendance =====
      const totalLateMinutes = attendanceRecords.reduce(
        (sum, rec) => sum + (rec.lateMinutes || 0),
        0
      );

      let lateDeduction = 0;
      if (totalLateMinutes > 0) {
        if (emp.lateDeductionRate > 0) {
          lateDeduction = emp.lateDeductionRate * totalLateMinutes;
        } else {
          // Proportional: (basicSalary / 30 / 8 / 60) * totalLateMinutes
          lateDeduction = (basicSalary / 30 / 8 / 60) * totalLateMinutes;
        }
        lateDeduction = Math.round(lateDeduction * 100) / 100;
        detailsArr.push({ name: 'خصم تأخير', type: 'deduction', amount: lateDeduction });
      }

      // ===== 4. Calculate absence deductions =====
      const absentDays = attendanceRecords.filter(
        rec => rec.status === 'absent'
      ).length;

      let absenceDeduction = 0;
      if (absentDays > 0) {
        if (emp.absenceDeductionRate > 0) {
          absenceDeduction = emp.absenceDeductionRate * absentDays;
        } else {
          // Daily rate: (basicSalary / 30) * absentDays
          absenceDeduction = (basicSalary / 30) * absentDays;
        }
        absenceDeduction = Math.round(absenceDeduction * 100) / 100;
        detailsArr.push({ name: 'خصم غياب', type: 'deduction', amount: absenceDeduction });
      }

      // ===== 5. Calculate social security (7% of basicSalary) =====
      const socialSecurity = Math.round(basicSalary * 0.07 * 100) / 100;
      if (socialSecurity > 0) {
        detailsArr.push({ name: 'الضمان الاجتماعي', type: 'deduction', amount: socialSecurity });
      }

      // ===== 6. Calculate tax (5% of taxable earnings above 1000 JOD) =====
      const taxableEarnings = basicSalary + housingAllowance + transportAllowance + foodAllowance + otherAllowances + overtimePay;
      let taxAmount = 0;
      if (taxableEarnings > 1000) {
        taxAmount = Math.round((taxableEarnings - 1000) * 0.05 * 100) / 100;
        detailsArr.push({ name: 'ضريبة الدخل', type: 'deduction', amount: taxAmount });
      }

      // Loan deduction (not auto-calculated, kept at 0)
      const loanDeduction = 0;

      // ===== Calculate totals =====
      const empEarnings = basicSalary + housingAllowance + transportAllowance + foodAllowance + otherAllowances + overtimePay;
      const empDeductions = socialSecurity + taxAmount + lateDeduction + absenceDeduction + loanDeduction;
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
                position: { select: { title: true } },
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
