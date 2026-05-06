import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const devices = await db.fingerprintDevice.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'فشل في جلب أجهزة البصمة' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, deviceType, model, ipAddress, port, location, username, password, apiKey, syncInterval, isDefault } = body;

    if (!name || !ipAddress) {
      return NextResponse.json({ error: 'الحقول المطلوبة غير مكتملة' }, { status: 400 });
    }

    const defaultPort = deviceType === 'hikvision' ? 80 : 4370;

    const device = await db.fingerprintDevice.create({
      data: {
        name,
        deviceType: deviceType || 'zk',
        model: model || null,
        ipAddress,
        port: port || defaultPort,
        location: location || null,
        username: username || null,
        password: password || null,
        apiKey: apiKey || null,
        syncInterval: syncInterval || 30,
        isDefault: isDefault || false,
        status: 'offline',
      },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json({ error: 'فشل في إنشاء جهاز البصمة' }, { status: 500 });
  }
}
