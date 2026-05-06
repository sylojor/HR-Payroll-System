import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const device = await db.fingerprintDevice.findUnique({ where: { id } });

    if (!device) {
      return NextResponse.json({ error: 'الجهاز غير موجود' }, { status: 404 });
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الجهاز' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, deviceType, model, ipAddress, port, location, username, password, apiKey, syncInterval, status, isDefault } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (deviceType !== undefined) updateData.deviceType = deviceType;
    if (model !== undefined) updateData.model = model;
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
    if (port !== undefined) updateData.port = port;
    if (location !== undefined) updateData.location = location;
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (syncInterval !== undefined) updateData.syncInterval = syncInterval;
    if (status !== undefined) updateData.status = status;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const device = await db.fingerprintDevice.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'فشل في تحديث بيانات الجهاز' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.fingerprintDevice.delete({ where: { id } });
    return NextResponse.json({ message: 'تم حذف الجهاز بنجاح' });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ error: 'فشل في حذف الجهاز' }, { status: 500 });
  }
}
