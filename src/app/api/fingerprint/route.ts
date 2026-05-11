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
  action?: string // 'sync', 'activate', 'deactivate', 'test', 'pull', 'push_employee', 'push_all_employees', 'auto_sync'
  employeeId?: string // for push_employee action
}

const FREE_TIER_MAX_DEVICES = 6

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

    // Check license - free tier allows 6 devices
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

    // Handle special actions
    if (body.action === 'test') {
      return handleTestConnection(existing)
    }

    if (body.action === 'sync' || body.action === 'pull') {
      return handleSyncDevice(existing)
    }

    if (body.action === 'push_employee') {
      return handlePushEmployee(existing, body.employeeId)
    }

    if (body.action === 'push_all_employees') {
      return handlePushAllEmployees(existing)
    }

    if (body.action === 'auto_sync') {
      return handleAutoSync()
    }

    const updateData: Record<string, unknown> = {}

    if (body.action === 'activate') {
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

/**
 * Test connection to a ZK fingerprint device
 */
async function handleTestConnection(device: { id: string; ip: string; port: number }) {
  try {
    const { testDevice } = await import('@/lib/zk-device')
    const result = await testDevice(device.ip, device.port)

    if (result.success) {
      // Update device info in database
      const updateData: Record<string, unknown> = { status: 'ACTIVE' }
      if (result.sn) updateData.sn = result.sn
      if (result.firmware) updateData.firmware = result.firmware

      await db.fingerprintDevice.update({
        where: { id: device.id },
        data: updateData,
      })

      return NextResponse.json({
        success: true,
        message: 'Device connected successfully',
        sn: result.sn,
        firmware: result.firmware,
      })
    } else {
      await db.fingerprintDevice.update({
        where: { id: device.id },
        data: { status: 'ERROR' },
      })
      return NextResponse.json({
        success: false,
        error: result.error || 'Connection failed',
      }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    }, { status: 500 })
  }
}

/**
 * Sync (pull attendance logs) from a ZK fingerprint device
 */
async function handleSyncDevice(device: { id: string; ip: string; port: number }) {
  try {
    const { ZKDevice } = await import('@/lib/zk-device')
    const zk = new ZKDevice(device.ip, device.port)

    await zk.connect()

    // Get device info
    let sn = ''
    let firmware = ''
    try { sn = await zk.getSerialNumber() } catch { /* ignore */ }
    try { firmware = await zk.getFirmwareVersion() } catch { /* ignore */ }

    // Pull attendance logs
    const logs = await zk.getAttendanceLogs()

    // Build employee map: deviceUserId -> employeeId
    const employees = await db.employee.findMany({
      where: { fingerprintEnrolled: true, fingerprintId: { not: '' } },
      select: { id: true, fingerprintId: true },
    })

    const employeeMap = new Map<number, string>()
    for (const emp of employees) {
      const fpId = parseInt(emp.fingerprintId)
      if (!isNaN(fpId)) {
        employeeMap.set(fpId, emp.id)
      }
    }

    // Group logs by employee+date for check-in/check-out pairing
    const groupedByUserDate = new Map<string, { employeeId: string; date: string; checkIn: Date | null; checkOut: Date | null }>()

    for (const log of logs) {
      const employeeId = employeeMap.get(log.userId)
      if (!employeeId) continue // Skip unknown users

      const dateStr = log.timestamp.substring(0, 10)
      const key = `${employeeId}_${dateStr}`
      const logTime = new Date(log.timestamp)

      // Get employee's shift for late calculation
      const existing = groupedByUserDate.get(key)
      if (!existing) {
        groupedByUserDate.set(key, {
          employeeId,
          date: dateStr,
          checkIn: log.status === 0 || log.status === 3 || log.status === 4 ? logTime : null,
          checkOut: log.status === 1 || log.status === 2 || log.status === 5 ? logTime : null,
        })
      } else {
        if (log.status === 0 || log.status === 3 || log.status === 4) {
          if (!existing.checkIn || logTime < existing.checkIn) existing.checkIn = logTime
        } else {
          if (!existing.checkOut || logTime > existing.checkOut) existing.checkOut = logTime
        }
      }
    }

    // Save to database
    let savedCount = 0
    const errors: string[] = []

    for (const [, record] of groupedByUserDate) {
      try {
        // Get employee's shift for late/overtime calculation
        const employee = await db.employee.findUnique({
          where: { id: record.employeeId },
          include: { shift: true },
        })

        let status = 'PRESENT'
        let lateMinutes = 0
        let overtimeHours = 0
        let earlyLeaveMinutes = 0

        if (employee?.shift && record.checkIn) {
          const shift = employee.shift
          const [shiftH, shiftM] = shift.startTime.split(':').map(Number)
          const checkInTime = record.checkIn.getHours() * 60 + record.checkIn.getMinutes()
          const shiftStartMinutes = shiftH * 60 + shiftM + shift.graceMinutes

          if (checkInTime > shiftStartMinutes) {
            status = 'LATE'
            lateMinutes = checkInTime - (shiftH * 60 + shiftM)
          }

          if (record.checkOut) {
            const [endH, endM] = shift.endTime.split(':').map(Number)
            const checkOutTime = record.checkOut.getHours() * 60 + record.checkOut.getMinutes()
            const shiftEndMinutes = endH * 60 + endM

            if (checkOutTime < shiftEndMinutes) {
              earlyLeaveMinutes = shiftEndMinutes - checkOutTime
            }

            // Calculate overtime
            const workMinutes = checkOutTime - checkInTime
            const thresholdMinutes = shift.overtimeThreshold * 60
            if (workMinutes > thresholdMinutes) {
              overtimeHours = (workMinutes - thresholdMinutes) / 60
            }
          }
        }

        // Upsert attendance record
        const existingRecord = await db.attendance.findFirst({
          where: {
            employeeId: record.employeeId,
            date: { gte: new Date(record.date + 'T00:00:00'), lte: new Date(record.date + 'T23:59:59') },
          },
        })

        if (existingRecord) {
          await db.attendance.update({
            where: { id: existingRecord.id },
            data: {
              checkIn: record.checkIn || existingRecord.checkIn,
              checkOut: record.checkOut || existingRecord.checkOut,
              status: status !== 'PRESENT' ? status : existingRecord.status,
              lateMinutes,
              earlyLeaveMinutes,
              overtimeHours,
              deviceId: device.id,
              fingerprintMatch: true,
            },
          })
        } else {
          await db.attendance.create({
            data: {
              employeeId: record.employeeId,
              date: new Date(record.date + 'T00:00:00'),
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              status,
              lateMinutes,
              earlyLeaveMinutes,
              overtimeHours,
              deviceId: device.id,
              fingerprintMatch: true,
            },
          })
        }
        savedCount++
      } catch (err) {
        errors.push(`Error saving record for employee ${record.employeeId}: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }

    // Clear logs from device after successful sync
    if (savedCount > 0) {
      await zk.clearAttendanceLogs()
    }

    await zk.disconnect()

    // Update device last sync time and info
    await db.fingerprintDevice.update({
      where: { id: device.id },
      data: {
        lastSync: new Date(),
        status: 'ACTIVE',
        sn: sn || undefined,
        firmware: firmware || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Synced ${savedCount} attendance records`,
      recordsPulled: logs.length,
      recordsSaved: savedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    // Update device status to ERROR
    await db.fingerprintDevice.update({
      where: { id: device.id },
      data: { status: 'ERROR' },
    }).catch(() => {})

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    }, { status: 500 })
  }
}

/**
 * Push a single employee to the fingerprint device
 */
async function handlePushEmployee(device: { id: string; ip: string; port: number }, employeeId?: string) {
  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
  }

  try {
    const employee = await db.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { ZKDevice } = await import('@/lib/zk-device')
    const zk = new ZKDevice(device.ip, device.port)
    await zk.connect()

    // Determine the fingerprint ID on device
    // Use a sequential number based on employee count
    let fpId = parseInt(employee.fingerprintId) || 0
    if (!fpId) {
      const lastEmployee = await db.employee.findFirst({
        where: { fingerprintId: { not: '' } },
        orderBy: { fingerprintId: 'desc' },
        select: { fingerprintId: true },
      })
      fpId = lastEmployee ? parseInt(lastEmployee.fingerprintId) + 1 : 1
    }

    const success = await zk.setUser({
      uid: fpId,
      userId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      password: '',
      role: 0, // Regular user
    })

    await zk.disconnect()

    if (success) {
      // Update employee record
      await db.employee.update({
        where: { id: employeeId },
        data: {
          fingerprintEnrolled: true,
          fingerprintId: String(fpId),
        },
      })

      return NextResponse.json({
        success: true,
        message: `Employee pushed to device (ID: ${fpId})`,
        fingerprintId: fpId,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Device rejected the user data',
      }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Push failed',
    }, { status: 500 })
  }
}

/**
 * Push all employees to the fingerprint device
 */
async function handlePushAllEmployees(device: { id: string; ip: string; port: number }) {
  try {
    const employees = await db.employee.findMany({
      where: { status: 'ACTIVE' },
    })

    const { ZKDevice } = await import('@/lib/zk-device')
    const zk = new ZKDevice(device.ip, device.port)
    await zk.connect()

    let pushedCount = 0
    const errors: string[] = []

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      let fpId = parseInt(emp.fingerprintId) || (i + 1)

      try {
        const success = await zk.setUser({
          uid: fpId,
          userId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          password: '',
          role: 0,
        })

        if (success) {
          await db.employee.update({
            where: { id: emp.id },
            data: {
              fingerprintEnrolled: true,
              fingerprintId: String(fpId),
            },
          })
          pushedCount++
        }
      } catch (err) {
        errors.push(`${emp.employeeId}: ${err instanceof Error ? err.message : 'Failed'}`)
      }
    }

    await zk.disconnect()

    return NextResponse.json({
      success: true,
      message: `Pushed ${pushedCount} of ${employees.length} employees to device`,
      pushedCount,
      totalEmployees: employees.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Push all failed',
    }, { status: 500 })
  }
}

/**
 * Auto-sync all active devices (called on startup)
 */
async function handleAutoSync() {
  try {
    const devices = await db.fingerprintDevice.findMany({
      where: { status: 'ACTIVE' },
    })

    const results = []

    for (const device of devices) {
      try {
        const syncResult = await handleSyncDevice(device)
        const data = await syncResult.json()
        results.push({
          deviceId: device.id,
          deviceName: device.name,
          ...data,
        })
      } catch (error) {
        results.push({
          deviceId: device.id,
          deviceName: device.name,
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-synced ${results.length} devices`,
      results,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Auto-sync failed',
    }, { status: 500 })
  }
}
