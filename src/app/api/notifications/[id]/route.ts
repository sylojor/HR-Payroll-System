import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const notification = await db.notification.update({
      where: { id },
      data: {
        isRead: body.isRead !== undefined ? body.isRead : true,
        readAt: body.isRead !== false ? new Date() : null,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Notification PUT error:', error);
    return NextResponse.json({ error: 'فشل في تحديث التنبيه' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification DELETE error:', error);
    return NextResponse.json({ error: 'فشل في حذف التنبيه' }, { status: 500 });
  }
}
