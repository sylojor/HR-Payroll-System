import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const device = await db.fingerprintDevice.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ error: 'الجهاز غير موجود' }, { status: 404 });
    }

    // Simulate sync: update lastSync timestamp and set status to online
    const updatedDevice = await db.fingerprintDevice.update({
      where: { id },
      data: {
        lastSync: new Date(),
        status: 'online',
      },
    });

    return NextResponse.json({
      message: 'تمت المزامنة بنجاح',
      device: updatedDevice,
    });
  } catch (error) {
    console.error('Error syncing device:', error);
    return NextResponse.json({ error: 'فشل في مزامنة الجهاز' }, { status: 500 });
  }
}
