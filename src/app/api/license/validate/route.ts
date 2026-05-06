import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateLicenseKeyFormat } from '@/lib/license';

// POST: Validate a license key without activating
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { error: 'مفتاح الترخيص مطلوب' },
        { status: 400 }
      );
    }

    // Check format
    if (!validateLicenseKeyFormat(licenseKey)) {
      return NextResponse.json({
        valid: false,
        error: 'صيغة مفتاح الترخيص غير صالحة',
        checks: {
          format: false,
          exists: false,
          active: false,
          notExpired: false,
        },
      });
    }

    // Check if key exists in database
    const license = await db.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      return NextResponse.json({
        valid: false,
        error: 'مفتاح الترخيص غير موجود',
        checks: {
          format: true,
          exists: false,
          active: false,
          notExpired: false,
        },
      });
    }

    const isActive = license.isActive;
    const isNotExpired = new Date(license.expiresAt) > new Date();
    const isAlreadyActivated = !!license.activatedAt;

    return NextResponse.json({
      valid: isActive && isNotExpired,
      error: !isActive
        ? 'مفتاح الترخيص معطل'
        : !isNotExpired
          ? 'مفتاح الترخيص منتهي الصلاحية'
          : null,
      checks: {
        format: true,
        exists: true,
        active: isActive,
        notExpired: isNotExpired,
      },
      details: {
        companyName: license.companyName,
        maxEmployees: license.maxEmployees,
        maxDevices: license.maxDevices,
        expiresAt: license.expiresAt,
        isAlreadyActivated,
        machineId: license.machineId,
      },
    });
  } catch (error) {
    console.error('Error validating license:', error);
    return NextResponse.json(
      { error: 'فشل في التحقق من الترخيص' },
      { status: 500 }
    );
  }
}
