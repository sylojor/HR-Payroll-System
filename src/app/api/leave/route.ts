import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreateLeaveBody {
  employeeId: string
  typeId: string
  startDate: string
  endDate: string
  days: number
  reason?: string
}

interface UpdateLeaveBody {
  id: string
  action: 'approve' | 'reject'
  approvedBy?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    const leaves = await db.leave.findMany({
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
        leaveType: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            isPaid: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ leaves })
  } catch (error) {
    console.error('Leaves list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch leaves'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLeaveBody = await request.json()

    if (!body.employeeId || !body.typeId || !body.startDate || !body.endDate || !body.days) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, typeId, startDate, endDate, days' },
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

    // Verify leave type exists
    const leaveType = await db.leaveType.findUnique({
      where: { id: body.typeId },
    })
    if (!leaveType) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      )
    }

    const leave = await db.leave.create({
      data: {
        employeeId: body.employeeId,
        typeId: body.typeId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        days: body.days,
        status: 'PENDING',
        reason: body.reason ?? '',
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
        leaveType: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
      },
    })

    return NextResponse.json({ leave }, { status: 201 })
  } catch (error) {
    console.error('Create leave error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create leave'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateLeaveBody = await request.json()

    if (!body.id || !body.action) {
      return NextResponse.json(
        { error: 'Leave ID and action (approve/reject) are required' },
        { status: 400 }
      )
    }

    const existing = await db.leave.findUnique({ where: { id: body.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 })
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Leave request has already been processed' },
        { status: 400 }
      )
    }

    const newStatus = body.action === 'approve' ? 'APPROVED' : 'REJECTED'

    const leave = await db.leave.update({
      where: { id: body.id },
      data: {
        status: newStatus,
        approvedBy: body.approvedBy ?? 'Administrator',
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
        leaveType: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
      },
    })

    // If approved, update employee status if currently on leave date range
    if (body.action === 'approve') {
      const now = new Date()
      if (now >= existing.startDate && now <= existing.endDate) {
        await db.employee.update({
          where: { id: existing.employeeId },
          data: { status: 'ON_LEAVE' },
        })
      }
    }

    return NextResponse.json({ leave })
  } catch (error) {
    console.error('Update leave error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update leave'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
