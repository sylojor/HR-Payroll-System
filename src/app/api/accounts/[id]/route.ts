import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, name, nameEn, type, category, parentId, balance, isActive } = body;

    const account = await db.account.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(parentId !== undefined && { parentId }),
        ...(balance !== undefined && { balance }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Account PUT error:', error);
    return NextResponse.json({ error: 'فشل في تحديث الحساب' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if account has transactions
    const debitCount = await db.transaction.count({ where: { debitAccountId: id } });
    const creditCount = await db.transaction.count({ where: { creditAccountId: id } });

    if (debitCount + creditCount > 0) {
      return NextResponse.json(
        { error: 'لا يمكن حذف هذا الحساب لأنه مرتبط بقيود محاسبية' },
        { status: 400 }
      );
    }

    await db.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account DELETE error:', error);
    return NextResponse.json({ error: 'فشل في حذف الحساب' }, { status: 500 });
  }
}
