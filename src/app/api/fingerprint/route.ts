import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreateDeviceBody {
  name: string
  ip: string
  port?: number
  deviceType?: string
  location?: string
  sn?: string
}

interface UpdateDeviceBody {
  id: string
  name?: string
  ip?: string
  port?: number
  status?: string
  location?: string
  lastSync?: string
  sn?: string
  firmware?: string
  action?: string // 'sync', 'activate', 'deactivate'
}

const FREE_TIER_MAX_DEVICES = 3

export async function GET() {
  try {
    const devices = await db.fingerprintDevice.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Fingerprint devices list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch devices'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateDeviceBody = await request.json()

    if (!body.name || !body.ip) {
      return NextResponse.json(
        { error: 'Device name and IP are required' },
        { status: 400 }
      )
    }

    // Check license - free tier allows only 3 devices
    const currentDeviceCount = await db.fingerprintDevice.count()
    const fingerprintLicense = await db.license.findFirst({
      where: { module: 'FINGERPRINT', isActive: true },
    })

    const maxAllowed = fingerprintLicense?.maxDevices ?? FREE_TIER_MAX_DEVICES
    if (currentDeviceCount >= maxAllowed) {
      return NextResponse.json(
        { error: `License limit reached. Maximum ${maxAllowed} fingerprint devices allowed. Please upgrade your license.` },
        { status: 403 }
      )
    }

    const device = await db.fingerprintDevice.create({
      data: {
        name: body.name,
        ip: body.ip,
        port: body.port ?? 4370,
        deviceType: body.deviceType ?? 'ZK',
        status: 'ACTIVE',
        location: body.location ?? '',
        sn: body.sn ?? '',
      },
    })

    // Update license activated devices count
    if (fingerprintLicense) {
      await db.license.update({
        where: { id: fingerprintLicense.id },
        data: { activatedDevices: currentDeviceCount + 1 },
      })
    }

    return NextResponse.json({ device }, { status: 201 })
  } catch (error) {
    console.error('Create fingerprint device error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create device'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateDeviceBody = await request.json()

    const deviceId = body.id
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    const existing = await db.fingerprintDevice.findUnique({ where: { id: deviceId } })
    if (!existing) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.action === 'sync') {
      updateData.lastSync = new Date()
      updateData.status = 'ACTIVE'
    } else if (body.action === 'activate') {
      updateData.status = 'ACTIVE'
    } else if (body.action === 'deactivate') {
      updateData.status = 'INACTIVE'
    }

    // Allow general field updates too
    if (body.name !== undefined) updateData.name = body.name
    if (body.ip !== undefined) updateData.ip = body.ip
    if (body.port !== undefined) updateData.port = body.port
    if (body.location !== undefined) updateData.location = body.location
    if (body.sn !== undefined) updateData.sn = body.sn
    if (body.firmware !== undefined) updateData.firmware = body.firmware
    if (body.status !== undefined) updateData.status = body.status
    if (body.lastSync !== undefined) updateData.lastSync = new Date(body.lastSync)

    const device = await db.fingerprintDevice.update({
      where: { id: deviceId },
      data: updateData,
    })

    return NextResponse.json({ device })
  } catch (error) {
    console.error('Update fingerprint device error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update device'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
