import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, nameEn, type, category, isFixed, isTaxable, defaultValue, description } = body;

    const component = await db.salaryComponent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(isFixed !== undefined && { isFixed }),
        ...(isTaxable !== undefined && { isTaxable }),
        ...(defaultValue !== undefined && { defaultValue }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json({ component });
  } catch (error) {
    console.error('Salary component PUT error:', error);
    return NextResponse.json({ error: 'فشل في تحديث مكون الراتب' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if component is used by employees
    const usageCount = await db.employeeSalaryComponent.count({
      where: { componentId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف هذا المكون لأنه مستخدم من قبل ${usageCount} موظف` },
        { status: 400 }
      );
    }

    await db.salaryComponent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Salary component DELETE error:', error);
    return NextResponse.json({ error: 'فشل في حذف مكون الراتب' }, { status: 500 });
  }
}
