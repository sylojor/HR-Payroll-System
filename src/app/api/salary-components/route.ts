import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const components = await db.salaryComponent.findMany({
      orderBy: [{ type: 'asc' }, { category: 'asc' }],
      include: {
        _count: { select: { employeeComponents: true } },
      },
    });

    return NextResponse.json({ components });
  } catch (error) {
    console.error('Salary components GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب مكونات الرواتب' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, nameEn, type, category, isFixed, isTaxable, defaultValue, description } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'اسم المكون والنوع مطلوبان' }, { status: 400 });
    }

    const component = await db.salaryComponent.create({
      data: {
        name,
        nameEn: nameEn || null,
        type,
        category: category || 'basic',
        isFixed: isFixed ?? true,
        isTaxable: isTaxable ?? true,
        defaultValue: defaultValue ?? 0,
        description: description || null,
      },
    });

    return NextResponse.json({ component });
  } catch (error) {
    console.error('Salary component POST error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء مكون الراتب' }, { status: 500 });
  }
}
