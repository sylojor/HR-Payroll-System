import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const departments = await db.department.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      departments.map((d) => ({
        id: d.id,
        name: d.name,
        nameEn: d.nameEn,
        description: d.description,
        managerId: d.managerId,
        employeeCount: d._count.employees,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
    );
  } catch (error) {
    console.error('Departments API error:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الأقسام' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, nameEn, description, managerId } = body;

    if (!name) {
      return NextResponse.json({ error: 'اسم القسم مطلوب' }, { status: 400 });
    }

    const department = await db.department.create({
      data: {
        name,
        nameEn: nameEn || null,
        description: description || null,
        managerId: managerId || null,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء القسم' }, { status: 500 });
  }
}
