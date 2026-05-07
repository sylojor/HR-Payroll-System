import { db } from '@/lib/db';
import { testZKConnection, testHikvisionConnection } from '@/lib/zk-service';
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

    const config = {
      id: device.id,
      ipAddress: device.ipAddress,
      port: device.port,
      deviceType: device.deviceType,
      username: device.username || undefined,
      password: device.password || undefined,
      apiKey: device.apiKey || undefined,
      model: device.model || undefined,
    };

    let result;

    if (device.deviceType === 'zk') {
      result = await testZKConnection(config);
    } else if (device.deviceType === 'hikvision') {
      result = await testHikvisionConnection(config);
    } else {
      return NextResponse.json({ error: 'نوع الجهاز غير مدعوم' }, { status: 400 });
    }

    // Update device status based on test result
    await db.fingerprintDevice.update({
      where: { id },
      data: {
        status: result.success ? 'online' : 'offline',
        serialNumber: result.info?.serialNumber || device.serialNumber,
      }
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'الاتصال ناجح بالجهاز' : 'فشل الاتصال بالجهاز',
      info: result.info,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Error testing device:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'فشل في اختبار الاتصال' 
    }, { status: 500 });
  }
}
