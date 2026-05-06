import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const isRead = searchParams.get('isRead');

    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (isRead !== null && isRead !== undefined && isRead !== '') {
      where.isRead = isRead === 'true';
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب التنبيهات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, title, message, type, category, actionUrl } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'العنوان والرسالة مطلوبان' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        employeeId: employeeId || null,
        title,
        message,
        type: type || 'info',
        category: category || 'system',
        actionUrl: actionUrl || null,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء التنبيه' }, { status: 500 });
  }
}
