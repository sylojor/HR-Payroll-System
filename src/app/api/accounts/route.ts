import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: Record<string, string> = {};
    if (type && type !== 'all') {
      where.type = type;
    }

    const accounts = await db.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Accounts GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب الحسابات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, nameEn, type, category, parentId, balance, isActive } = body;

    if (!code || !name || !type) {
      return NextResponse.json({ error: 'رمز الحساب واسمه ونوعه مطلوبون' }, { status: 400 });
    }

    // Check for duplicate code
    const existing = await db.account.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'رمز الحساب موجود مسبقاً' }, { status: 400 });
    }

    const account = await db.account.create({
      data: {
        code,
        name,
        nameEn: nameEn || null,
        type,
        category: category || null,
        parentId: parentId || null,
        balance: balance ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Account POST error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء الحساب' }, { status: 500 });
  }
}
