import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreateAttendanceBody {
  employeeId: string
  date?: string
  checkIn?: string
  checkOut?: string
  status?: string
  overtimeHours?: number
  lateMinutes?: number
  earlyLeaveMinutes?: number
  notes?: string
  deviceId?: string
  fingerprintMatch?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      where.date = { gte: targetDate, lt: nextDay }
    } else if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) }
    } else if (startDate) {
      where.date = { gte: new Date(startDate) }
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (status) {
      where.status = status
    }

    const attendance = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 500,
    })

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('Attendance list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch attendance'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAttendanceBody = await request.json()

    if (!body.employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Verify employee exists
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId },
    })
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const attendanceDate = body.date ? new Date(body.date) : new Date()
    const dateStart = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate())
    const dateEnd = new Date(dateStart.getTime() + 86400000)

    // Check if attendance already exists for this employee on this date
    const existingRecord = await db.attendance.findFirst({
      where: {
        employeeId: body.employeeId,
        date: { gte: dateStart, lt: dateEnd },
      },
    })

    if (existingRecord) {
      // Update existing record (e.g., check-out)
      const updateData: Record<string, unknown> = {}
      if (body.checkOut) {
        updateData.checkOut = new Date(body.checkOut)
      }
      if (body.status) {
        updateData.status = body.status
      }
      if (body.overtimeHours !== undefined) {
        updateData.overtimeHours = body.overtimeHours
      }
      if (body.earlyLeaveMinutes !== undefined) {
        updateData.earlyLeaveMinutes = body.earlyLeaveMinutes
      }
      if (body.notes !== undefined) {
        updateData.notes = body.notes
      }
      if (body.fingerprintMatch !== undefined) {
        updateData.fingerprintMatch = body.fingerprintMatch
      }

      const updated = await db.attendance.update({
        where: { id: existingRecord.id },
        data: updateData,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      return NextResponse.json({ attendance: updated })
    }

    // Create new attendance record
    const attendance = await db.attendance.create({
      data: {
        employeeId: body.employeeId,
        date: dateStart,
        checkIn: body.checkIn ? new Date(body.checkIn) : new Date(),
        checkOut: body.checkOut ? new Date(body.checkOut) : null,
        status: body.status ?? 'PRESENT',
        overtimeHours: body.overtimeHours ?? 0,
        lateMinutes: body.lateMinutes ?? 0,
        earlyLeaveMinutes: body.earlyLeaveMinutes ?? 0,
        notes: body.notes ?? '',
        deviceId: body.deviceId ?? '',
        fingerprintMatch: body.fingerprintMatch ?? false,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ attendance }, { status: 201 })
  } catch (error) {
    console.error('Create attendance error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create attendance'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
