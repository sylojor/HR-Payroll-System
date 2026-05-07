import { db } from '@/lib/db';
import { syncZKAttendance, syncHikvisionAttendance } from '@/lib/zk-service';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const devices = await db.fingerprintDevice.findMany({
      where: { status: 'online' },
    });

    const results = [];

    for (const device of devices) {
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

      try {
        let result;
        if (device.deviceType === 'zk') {
          result = await syncZKAttendance(config);
        } else if (device.deviceType === 'hikvision') {
          result = await syncHikvisionAttendance(config);
        } else {
          continue;
        }

        results.push({
          deviceId: device.id,
          deviceName: device.name,
          ...result,
        });
      } catch (error: any) {
        results.push({
          deviceId: device.id,
          deviceName: device.name,
          success: false,
          synced: 0,
          skipped: 0,
          errors: [error.message || 'فشل المزامنة'],
        });
      }
    }

    const totalSynced = results.reduce((sum: number, r) => sum + r.synced, 0);
    const totalSkipped = results.reduce((sum: number, r) => sum + r.skipped, 0);

    return NextResponse.json({
      message: `تمت مزامنة ${results.length} جهاز - ${totalSynced} سجل جديد، ${totalSkipped} تم تجاهلهم`,
      success: true,
      totalDevices: results.length,
      totalSynced,
      totalSkipped,
      results,
    });
  } catch (error: any) {
    console.error('Error syncing all devices:', error);
    return NextResponse.json({ error: error.message || 'فشل في مزامنة الأجهزة' }, { status: 500 });
  }
}
