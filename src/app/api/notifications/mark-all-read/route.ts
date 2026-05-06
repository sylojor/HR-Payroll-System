import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const result = await db.notification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json({ error: 'فشل في تحديث التنبيهات' }, { status: 500 });
  }
}
