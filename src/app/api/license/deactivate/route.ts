import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Deactivate current license (set isActive = false)
export async function POST() {
  try {
    const license = await db.license.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'لا يوجد ترخيص مفعّل' },
        { status: 404 }
      );
    }

    await db.license.update({
      where: { id: license.id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      message: 'تم إلغاء تفعيل الترخيص بنجاح',
    });
  } catch (error) {
    console.error('Error deactivating license:', error);
    return NextResponse.json(
      { error: 'فشل في إلغاء تفعيل الترخيص' },
      { status: 500 }
    );
  }
}
