import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const message = await db.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
        recipients: {
          include: {
            employee: {
              select: { firstName: true, lastName: true, employeeId: true },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Message GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب الرسالة' }, { status: 500 });
  }
}
