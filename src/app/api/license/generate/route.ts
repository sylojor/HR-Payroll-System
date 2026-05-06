import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateLicenseKey, calculateExpiry } from '@/lib/license';

// POST: Generate a new license key (admin function)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      companyEmail,
      phone,
      maxEmployees = 50,
      maxDevices = 5,
      modules = 'all',
      durationMonths = 12,
      notes,
    } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: 'اسم الشركة مطلوب' },
        { status: 400 }
      );
    }

    // Generate a unique license key
    let licenseKey = generateLicenseKey();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.license.findUnique({
        where: { licenseKey },
      });
      if (!existing) break;
      licenseKey = generateLicenseKey();
      attempts++;
    }

    const expiresAt = calculateExpiry(durationMonths);

    // Ensure modules is stored as proper JSON string
    let modulesStr = 'all';
    if (modules !== 'all') {
      if (Array.isArray(modules)) {
        modulesStr = JSON.stringify(modules);
      } else if (typeof modules === 'string') {
        try {
          JSON.parse(modules);
          modulesStr = modules;
        } catch {
          modulesStr = JSON.stringify([modules]);
        }
      }
    }

    const license = await db.license.create({
      data: {
        licenseKey,
        companyName,
        companyEmail: companyEmail || null,
        phone: phone || null,
        maxEmployees,
        maxDevices,
        modules: modulesStr,
        expiresAt,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      message: 'تم إنشاء مفتاح الترخيص بنجاح',
      license: {
        id: license.id,
        licenseKey: license.licenseKey,
        companyName: license.companyName,
        companyEmail: license.companyEmail,
        phone: license.phone,
        maxEmployees: license.maxEmployees,
        maxDevices: license.maxDevices,
        modules: license.modules,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        notes: license.notes,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating license:', error);
    return NextResponse.json(
      { error: 'فشل في إنشاء مفتاح الترخيص' },
      { status: 500 }
    );
  }
}
