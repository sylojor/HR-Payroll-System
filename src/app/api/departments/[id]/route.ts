import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.department.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'القسم غير موجود' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameEn !== undefined) updateData.nameEn = body.nameEn || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.managerId !== undefined) updateData.managerId = body.managerId || null;

    const department = await db.department.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    return NextResponse.json({ error: 'فشل في تحديث القسم' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'القسم غير موجود' }, { status: 404 });
    }

    if (existing._count.employees > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف قسم يحتوي على موظفين' }, { status: 400 });
    }

    await db.department.delete({ where: { id } });

    return NextResponse.json({ message: 'تم حذف القسم بنجاح' });
  } catch (error) {
    console.error('Delete department error:', error);
    return NextResponse.json({ error: 'فشل في حذف القسم' }, { status: 500 });
  }
}
