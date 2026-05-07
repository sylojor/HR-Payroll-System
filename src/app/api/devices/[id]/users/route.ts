import { db } from '@/lib/db';
import { getZKUsers } from '@/lib/zk-service';
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

    if (device.deviceType !== 'zk') {
      return NextResponse.json({ error: 'هذه الميزة متاحة فقط لأجهزة ZK' }, { status: 400 });
    }

    const config = {
      id: device.id,
      ipAddress: device.ipAddress,
      port: device.port,
      deviceType: device.deviceType,
      username: device.username || undefined,
      password: device.password || undefined,
    };

    const users = await getZKUsers(config);

    // Get our employees for mapping
    const employees = await db.employee.findMany({
      select: { id: true, fingerprintId: true, firstName: true, lastName: true }
    });

    // Map device users with our employees
    const mappedUsers = users.map((user: any) => {
      const employee = employees.find(e => e.fingerprintId === String(user.uid));
      return {
        deviceUserId: user.uid,
        name: user.name,
        role: user.role,
        cardNo: user.cardNo,
        matchedEmployee: employee ? {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          fingerprintId: employee.fingerprintId,
        } : null,
      };
    });

    return NextResponse.json({
      total: users.length,
      matched: mappedUsers.filter((u: any) => u.matchedEmployee).length,
      unmatched: mappedUsers.filter((u: any) => !u.matchedEmployee).length,
      users: mappedUsers,
    });
  } catch (error: any) {
    console.error('Error fetching device users:', error);
    return NextResponse.json({ error: error.message || 'فشل في جلب مستخدمي الجهاز' }, { status: 500 });
  }
}

/**
 * POST - Map device user to employee (set fingerprintId)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { employeeId, fingerprintId } = body;

    if (!employeeId || !fingerprintId) {
      return NextResponse.json({ error: 'الحقول المطلوبة غير مكتملة' }, { status: 400 });
    }

    const employee = await db.employee.update({
      where: { id: employeeId },
      data: { fingerprintId: String(fingerprintId) },
    });

    return NextResponse.json({
      message: 'تم ربط الموظف بمعرف البصمة بنجاح',
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        fingerprintId: employee.fingerprintId,
      },
    });
  } catch (error: any) {
    console.error('Error mapping device user:', error);
    return NextResponse.json({ error: error.message || 'فشل في ربط الموظف' }, { status: 500 });
  }
}
