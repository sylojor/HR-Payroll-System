import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreateShiftBody {
  name: string
  nameAr?: string
  startTime?: string
  endTime?: string
  graceMinutes?: number
  overtimeThreshold?: number
  isDefault?: boolean
  color?: string
  daysOfWeek?: string
}

interface UpdateShiftBody {
  id: string
  name?: string
  nameAr?: string
  startTime?: string
  endTime?: string
  graceMinutes?: number
  overtimeThreshold?: number
  isDefault?: boolean
  color?: string
  daysOfWeek?: string
}

export async function GET() {
  try {
    const shifts = await db.shift.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      shifts: shifts.map((s) => ({
        ...s,
        employeeCount: s._count.employees,
      })),
    })
  } catch (error) {
    console.error('Shifts list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch shifts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateShiftBody = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Shift name is required' },
        { status: 400 }
      )
    }

    // Validate time format
    if (body.startTime && !/^\d{2}:\d{2}$/.test(body.startTime)) {
      return NextResponse.json(
        { error: 'Start time must be in HH:MM format' },
        { status: 400 }
      )
    }
    if (body.endTime && !/^\d{2}:\d{2}$/.test(body.endTime)) {
      return NextResponse.json(
        { error: 'End time must be in HH:MM format' },
        { status: 400 }
      )
    }

    // If setting as default, unset all other defaults
    if (body.isDefault) {
      await db.shift.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const shift = await db.shift.create({
      data: {
        name: body.name,
        nameAr: body.nameAr ?? '',
        startTime: body.startTime ?? '08:00',
        endTime: body.endTime ?? '17:00',
        graceMinutes: body.graceMinutes ?? 15,
        overtimeThreshold: body.overtimeThreshold ?? 8.0,
        isDefault: body.isDefault ?? false,
        color: body.color ?? '#14B8A6',
        daysOfWeek: body.daysOfWeek ?? '0,1,2,3,4',
      },
    })

    return NextResponse.json({ shift }, { status: 201 })
  } catch (error) {
    console.error('Create shift error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create shift'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateShiftBody = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Shift ID is required' },
        { status: 400 }
      )
    }

    const existing = await db.shift.findUnique({ where: { id: body.id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    // Validate time format if provided
    if (body.startTime && !/^\d{2}:\d{2}$/.test(body.startTime)) {
      return NextResponse.json(
        { error: 'Start time must be in HH:MM format' },
        { status: 400 }
      )
    }
    if (body.endTime && !/^\d{2}:\d{2}$/.test(body.endTime)) {
      return NextResponse.json(
        { error: 'End time must be in HH:MM format' },
        { status: 400 }
      )
    }

    // If setting as default, unset all other defaults
    if (body.isDefault) {
      await db.shift.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.graceMinutes !== undefined) updateData.graceMinutes = body.graceMinutes
    if (body.overtimeThreshold !== undefined) updateData.overtimeThreshold = body.overtimeThreshold
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault
    if (body.color !== undefined) updateData.color = body.color
    if (body.daysOfWeek !== undefined) updateData.daysOfWeek = body.daysOfWeek

    const shift = await db.shift.update({
      where: { id: body.id },
      data: updateData,
    })

    return NextResponse.json({ shift })
  } catch (error) {
    console.error('Update shift error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update shift'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Shift ID is required' },
        { status: 400 }
      )
    }

    const existing = await db.shift.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    if (existing._count.employees > 0) {
      return NextResponse.json(
        { error: `Cannot delete shift with ${existing._count.employees} assigned employee(s). Please reassign employees first.` },
        { status: 400 }
      )
    }

    await db.shift.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete shift error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete shift'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
