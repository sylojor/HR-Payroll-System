import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const company = await db.company.findFirst();

    if (!company) {
      return NextResponse.json({ error: 'لم يتم العثور على بيانات الشركة' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Company GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الشركة' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name, nameEn, address, phone, email, currency, logo, workingHours, overtimeRate, fiscalYearStart } = body;

    const existing = await db.company.findFirst();

    let company;
    if (existing) {
      company = await db.company.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { name }),
          ...(nameEn !== undefined && { nameEn }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(currency !== undefined && { currency }),
          ...(logo !== undefined && { logo }),
          ...(workingHours !== undefined && { workingHours: parseFloat(workingHours) }),
          ...(overtimeRate !== undefined && { overtimeRate: parseFloat(overtimeRate) }),
          ...(fiscalYearStart !== undefined && { fiscalYearStart }),
        },
      });
    } else {
      company = await db.company.create({
        data: {
          name: name || 'شركتي',
          nameEn: nameEn || 'My Company',
          address: address || null,
          phone: phone || null,
          email: email || null,
          currency: currency || 'JOD',
          logo: logo || null,
          workingHours: workingHours ? parseFloat(workingHours) : 8.0,
          overtimeRate: overtimeRate ? parseFloat(overtimeRate) : 1.5,
          fiscalYearStart: fiscalYearStart || '01-01',
        },
      });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Company PUT error:', error);
    return NextResponse.json({ error: 'فشل في تحديث بيانات الشركة' }, { status: 500 });
  }
}
