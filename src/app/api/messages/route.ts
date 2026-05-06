import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');

    const where: any = {};
    if (recipientId) {
      where.recipients = {
        some: { employeeId: recipientId },
      };
    }

    const messages = await db.message.findMany({
      where,
      include: {
        sender: {
          select: { firstName: true, lastName: true },
        },
        recipients: {
          include: {
            employee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب الرسائل' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, subject, content, recipientIds, priority, isBroadcast } = body;

    if (!senderId || !subject || !content) {
      return NextResponse.json({ error: 'الحقول المطلوبة غير مكتملة' }, { status: 400 });
    }

    if (!isBroadcast && (!recipientIds || recipientIds.length === 0)) {
      return NextResponse.json({ error: 'يجب تحديد مستلم واحد على الأقل' }, { status: 400 });
    }

    let finalRecipientIds = recipientIds || [];
    if (isBroadcast) {
      const allEmployees = await db.employee.findMany({
        where: { status: 'active' },
        select: { id: true },
      });
      finalRecipientIds = allEmployees.map((e) => e.id).filter((id) => id !== senderId);
    }

    const message = await db.message.create({
      data: {
        senderId,
        subject,
        content,
        priority: priority || 'normal',
        isBroadcast: isBroadcast || false,
        recipients: {
          create: finalRecipientIds.map((empId: string) => ({
            employeeId: empId,
          })),
        },
      },
      include: {
        sender: {
          select: { firstName: true, lastName: true },
        },
        recipients: {
          include: {
            employee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'فشل في إرسال الرسالة' }, { status: 500 });
  }
}
