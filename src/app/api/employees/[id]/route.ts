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
        salaryComponents: { include: { component: true } },
        workSchedule: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الموظف' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'firstName', 'lastName', 'firstNameEn', 'lastNameEn', 'email', 'phone',
      'mobile', 'nationalId', 'passportNumber', 'birthDate', 'hireDate', 'endDate',
      'gender', 'maritalStatus', 'address', 'city', 'country', 'photo', 'status',
      'departmentId', 'positionId', 'workScheduleId', 'fingerprintId',
      'bankName', 'bankAccount', 'iban', 'emergencyContact', 'emergencyPhone', 'notes',
      'basicSalary', 'housingAllowance', 'transportAllowance', 'foodAllowance', 'otherAllowances',
      'maxOvertimeHours', 'overtimeRate', 'overtimeHourPrice',
      'annualVacationDays', 'sickVacationDays', 'usedVacationDays',
      'lateDeductionRate', 'absenceDeductionRate',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'hireDate' || field === 'birthDate' || field === 'endDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field] || null;
        }
      }
    }

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        position: true,
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'فشل في تحديث بيانات الموظف' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    await db.employee.delete({ where: { id } });

    return NextResponse.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'فشل في حذف الموظف' }, { status: 500 });
  }
}
