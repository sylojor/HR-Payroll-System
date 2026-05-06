import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const leaveTypes = await db.leaveType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { leaveRequests: true },
        },
      },
    });

    return NextResponse.json(leaveTypes);
  } catch (error) {
    console.error('Leave Types GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب أنواع الإجازات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, nameEn, defaultDays, isPaid, requiresApproval, carryForward } = body;

    if (!name) {
      return NextResponse.json({ error: 'اسم نوع الإجازة مطلوب' }, { status: 400 });
    }

    const leaveType = await db.leaveType.create({
      data: {
        name,
        nameEn: nameEn || null,
        defaultDays: parseInt(defaultDays) || 0,
        isPaid: isPaid !== undefined ? isPaid : true,
        requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
        carryForward: carryForward !== undefined ? carryForward : false,
      },
    });

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    console.error('Leave Types POST error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء نوع الإجازة' }, { status: 500 });
  }
}
