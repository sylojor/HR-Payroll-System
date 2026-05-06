import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLicenseStatus, validateLicenseKeyFormat } from '@/lib/license';

// GET: Return current license status
export async function GET() {
  try {
    const license = await db.license.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) {
      return NextResponse.json({
        isLicensed: false,
        isExpired: true,
        daysRemaining: 0,
        maxEmployees: 0,
        maxDevices: 0,
        modules: [],
        companyName: '',
        licenseKey: null,
        expiresAt: null,
        activatedAt: null,
        machineId: null,
      });
    }

    const status = getLicenseStatus(license);

    return NextResponse.json({
      ...status,
      licenseKey: license.licenseKey,
      expiresAt: license.expiresAt,
      activatedAt: license.activatedAt,
      machineId: license.machineId,
    });
  } catch (error) {
    console.error('Error fetching license status:', error);
    return NextResponse.json(
      { error: 'فشل في جلب حالة الترخيص' },
      { status: 500 }
    );
  }
}

// POST: Activate a license key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, machineId } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { error: 'مفتاح الترخيص مطلوب' },
        { status: 400 }
      );
    }

    if (!validateLicenseKeyFormat(licenseKey)) {
      return NextResponse.json(
        { error: 'صيغة مفتاح الترخيص غير صالحة' },
        { status: 400 }
      );
    }

    const license = await db.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'مفتاح الترخيص غير موجود' },
        { status: 404 }
      );
    }

    if (!license.isActive) {
      return NextResponse.json(
        { error: 'مفتاح الترخيص معطل' },
        { status: 400 }
      );
    }

    // Check if license is expired
    if (new Date(license.expiresAt) <= new Date()) {
      return NextResponse.json(
        { error: 'مفتاح الترخيص منتهي الصلاحية' },
        { status: 400 }
      );
    }

    // Check if license already activated on another machine
    if (license.activatedAt && license.machineId && license.machineId !== machineId) {
      return NextResponse.json(
        { error: 'مفتاح الترخيص مفعّل على جهاز آخر. يرجى إلغاء التفعيل أولاً' },
        { status: 400 }
      );
    }

    // Activate the license
    const updatedLicense = await db.license.update({
      where: { id: license.id },
      data: {
        activatedAt: new Date(),
        machineId: machineId || null,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    });

    const status = getLicenseStatus(updatedLicense);

    return NextResponse.json({
      message: 'تم تفعيل الترخيص بنجاح',
      ...status,
      licenseKey: updatedLicense.licenseKey,
      expiresAt: updatedLicense.expiresAt,
      activatedAt: updatedLicense.activatedAt,
      machineId: updatedLicense.machineId,
    });
  } catch (error) {
    console.error('Error activating license:', error);
    return NextResponse.json(
      { error: 'فشل في تفعيل الترخيص' },
      { status: 500 }
    );
  }
}

// DELETE: Deactivate current license
export async function DELETE() {
  try {
    const license = await db.license.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'لا يوجد ترخيص مفعّل' },
        { status: 404 }
      );
    }

    await db.license.update({
      where: { id: license.id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      message: 'تم إلغاء تفعيل الترخيص بنجاح',
    });
  } catch (error) {
    console.error('Error deactivating license:', error);
    return NextResponse.json(
      { error: 'فشل في إلغاء تفعيل الترخيص' },
      { status: 500 }
    );
  }
}
