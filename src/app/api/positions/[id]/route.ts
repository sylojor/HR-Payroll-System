import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.position.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'المنصب غير موجود' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.titleEn !== undefined) updateData.titleEn = body.titleEn || null;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.minSalary !== undefined) updateData.minSalary = body.minSalary || null;
    if (body.maxSalary !== undefined) updateData.maxSalary = body.maxSalary || null;

    const position = await db.position.update({
      where: { id },
      data: updateData,
      include: { department: { select: { name: true } } },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error('Update position error:', error);
    return NextResponse.json({ error: 'فشل في تحديث المنصب' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.position.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'المنصب غير موجود' }, { status: 404 });
    }

    if (existing._count.employees > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف منصب مرتبط بموظفين' }, { status: 400 });
    }

    await db.position.delete({ where: { id } });

    return NextResponse.json({ message: 'تم حذف المنصب بنجاح' });
  } catch (error) {
    console.error('Delete position error:', error);
    return NextResponse.json({ error: 'فشل في حذف المنصب' }, { status: 500 });
  }
}
