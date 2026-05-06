import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId') || '';

    const where: Record<string, unknown> = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const positions = await db.position.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { title: 'asc' },
    });

    return NextResponse.json(
      positions.map((p) => ({
        id: p.id,
        title: p.title,
        titleEn: p.titleEn,
        departmentId: p.departmentId,
        departmentName: p.department.name,
        minSalary: p.minSalary,
        maxSalary: p.maxSalary,
        employeeCount: p._count.employees,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    );
  } catch (error) {
    console.error('Positions API error:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات المناصب' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, titleEn, departmentId, minSalary, maxSalary } = body;

    if (!title || !departmentId) {
      return NextResponse.json({ error: 'المسمى الوظيفي والقسم مطلوبان' }, { status: 400 });
    }

    const position = await db.position.create({
      data: {
        title,
        titleEn: titleEn || null,
        departmentId,
        minSalary: minSalary || null,
        maxSalary: maxSalary || null,
      },
      include: {
        department: { select: { name: true } },
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error('Create position error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء المنصب' }, { status: 500 });
  }
}
