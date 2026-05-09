import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface ActivateLicenseBody {
  key: string
  machineId?: string
}

interface UpdateLicenseBody {
  id: string
  action: 'deactivate' | 'activate'
}

export async function GET() {
  try {
    const licenses = await db.license.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Compute license status summary - prioritize active licenses
    const fingerprintLicense = licenses.find(l => l.module === 'FINGERPRINT' && l.isActive) || licenses.find(l => l.module === 'FINGERPRINT')
    const hrLicense = licenses.find(l => l.module === 'HR' && l.isActive) || licenses.find(l => l.module === 'HR')
    const payrollLicense = licenses.find(l => l.module === 'PAYROLL' && l.isActive) || licenses.find(l => l.module === 'PAYROLL')

    return NextResponse.json({
      licenses,
      summary: {
        fingerprint: {
          active: fingerprintLicense?.isActive ?? false,
          maxDevices: fingerprintLicense?.maxDevices ?? 3,
          activatedDevices: fingerprintLicense?.activatedDevices ?? 0,
          expiresAt: fingerprintLicense?.expiresAt ?? null,
        },
        hr: {
          active: hrLicense?.isActive ?? false,
          expiresAt: hrLicense?.expiresAt ?? null,
        },
        payroll: {
          active: payrollLicense?.isActive ?? false,
          expiresAt: payrollLicense?.expiresAt ?? null,
        },
      },
    })
  } catch (error) {
    console.error('License list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch licenses'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ActivateLicenseBody = await request.json()

    if (!body.key) {
      return NextResponse.json(
        { error: 'License key is required' },
        { status: 400 }
      )
    }

    const license = await db.license.findUnique({
      where: { key: body.key },
    })

    if (!license) {
      return NextResponse.json(
        { error: 'Invalid license key' },
        { status: 404 }
      )
    }

    if (license.isActive) {
      return NextResponse.json(
        { error: 'License is already activated' },
        { status: 400 }
      )
    }

    // Check if expired
    if (license.expiresAt && new Date() > license.expiresAt) {
      return NextResponse.json(
        { error: 'License has expired' },
        { status: 400 }
      )
    }

    const updatedLicense = await db.license.update({
      where: { id: license.id },
      data: {
        isActive: true,
        activatedAt: new Date(),
        machineId: body.machineId ?? '',
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'ACTIVATE_LICENSE',
        entity: 'License',
        entityId: license.id,
        details: `License ${license.module} activated`,
      },
    })

    return NextResponse.json({ license: updatedLicense })
  } catch (error) {
    console.error('Activate license error:', error)
    const message = error instanceof Error ? error.message : 'Failed to activate license'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateLicenseBody = await request.json()

    if (!body.id || !body.action) {
      return NextResponse.json(
        { error: 'License ID and action are required' },
        { status: 400 }
      )
    }

    const existing = await db.license.findUnique({ where: { id: body.id } })
    if (!existing) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.action === 'deactivate') {
      updateData.isActive = false
      updateData.activatedDevices = 0
    } else if (body.action === 'activate') {
      updateData.isActive = true
    }

    const license = await db.license.update({
      where: { id: body.id },
      data: updateData,
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        action: `${body.action.toUpperCase()}_LICENSE`,
        entity: 'License',
        entityId: existing.id,
        details: `License ${existing.module} ${body.action}d`,
      },
    })

    return NextResponse.json({ license })
  } catch (error) {
    console.error('Update license error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update license'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
