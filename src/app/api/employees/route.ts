import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    else where.status = 'active';

    if (departmentId) where.departmentId = departmentId;

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeId: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          firstNameEn: true,
          lastNameEn: true,
          email: true,
          phone: true,
          mobile: true,
          nationalId: true,
          gender: true,
          status: true,
          hireDate: true,
          endDate: true,
          address: true,
          city: true,
          country: true,
          photo: true,
          fingerprintId: true,
          bankName: true,
          bankAccount: true,
          iban: true,
          departmentId: true,
          positionId: true,
          workScheduleId: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, title: true, departmentId: true } },
        },
        orderBy: { employeeId: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.employee.count({ where }),
    ]);

    return NextResponse.json({
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Employees GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الموظفين' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Auto-generate employeeId if not provided
    if (!body.employeeId) {
      const lastEmployee = await db.employee.findFirst({
        orderBy: { employeeId: 'desc' },
        select: { employeeId: true },
      });
      const lastNum = lastEmployee ? parseInt(lastEmployee.employeeId.replace('EMP', '')) : 0;
      body.employeeId = `EMP${String(lastNum + 1).padStart(3, '0')}`;
    }

    const employee = await db.employee.create({
      data: {
        employeeId: body.employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        firstNameEn: body.firstNameEn,
        lastNameEn: body.lastNameEn,
        email: body.email || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        nationalId: body.nationalId || null,
        passportNumber: body.passportNumber || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        hireDate: body.hireDate ? new Date(body.hireDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
        gender: body.gender || 'male',
        maritalStatus: body.maritalStatus || 'single',
        address: body.address || null,
        city: body.city || null,
        country: body.country || null,
        photo: body.photo || null,
        status: body.status || 'active',
        departmentId: body.departmentId || null,
        positionId: body.positionId || null,
        workScheduleId: body.workScheduleId || null,
        fingerprintId: body.fingerprintId || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        iban: body.iban || null,
        emergencyContact: body.emergencyContact || null,
        emergencyPhone: body.emergencyPhone || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Employee POST error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء الموظف' }, { status: 500 });
  }
}
