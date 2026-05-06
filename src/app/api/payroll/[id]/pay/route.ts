import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { itemIds } = body;

    const payroll = await db.payroll.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'كشف الرواتب غير موجود' }, { status: 404 });
    }

    const now = new Date();

    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      // Mark specific items as paid
      await db.payrollItem.updateMany({
        where: { id: { in: itemIds }, payrollId: id },
        data: { status: 'paid', paidAt: now },
      });
    } else {
      // Mark all items as paid
      await db.payrollItem.updateMany({
        where: { payrollId: id },
        data: { status: 'paid', paidAt: now },
      });
    }

    // Check if all items are now paid
    const updatedPayroll = await db.payroll.findUnique({
      where: { id },
      include: { items: true },
    });

    const allPaid = updatedPayroll?.items.every(i => i.status === 'paid');
    if (allPaid) {
      await db.payroll.update({
        where: { id },
        data: { status: 'paid' },
      });
    }

    return NextResponse.json({ success: true, allPaid });
  } catch (error) {
    console.error('Payroll pay error:', error);
    return NextResponse.json({ error: 'فشل في تحديث حالة الدفع' }, { status: 500 });
  }
}
