import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payroll = await db.payroll.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                department: { select: { name: true } },
                position: { select: { title: true } },
                bankName: true,
                bankAccount: true,
                iban: true,
              },
            },
          },
          orderBy: { employee: { employeeId: 'asc' } },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'كشف الرواتب غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ payroll });
  } catch (error) {
    console.error('Payroll detail GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب تفاصيل كشف الرواتب' }, { status: 500 });
  }
}
