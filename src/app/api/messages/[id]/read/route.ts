import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'معرف الموظف مطلوب' }, { status: 400 });
    }

    const recipient = await db.messageRecipient.findUnique({
      where: {
        messageId_employeeId: {
          messageId: id,
          employeeId,
        },
      },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'المستلم غير موجود' }, { status: 404 });
    }

    const updated = await db.messageRecipient.update({
      where: {
        messageId_employeeId: {
          messageId: id,
          employeeId,
        },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Mark as read error:', error);
    return NextResponse.json({ error: 'فشل في تحديث حالة القراءة' }, { status: 500 });
  }
}
