import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface UpdateEmployeeBody {
  firstName?: string
  lastName?: string
  firstNameAr?: string
  lastNameAr?: string
  email?: string
  phone?: string
  gender?: string
  dateOfBirth?: string | null
  nationality?: string
  address?: string
  emergencyContact?: string
  departmentId?: string
  positionId?: string
  hireDate?: string
  salary?: number
  status?: string
  fingerprintEnrolled?: boolean
  fingerprintId?: string
  photo?: string
  bankName?: string
  bankAccount?: string
  notes?: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        department: true,
        position: true,
        attendance: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        leaves: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            leaveType: true,
          },
        },
        payrollItems: {
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: {
            payroll: {
              select: { id: true, month: true, year: true, status: true },
            },
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Get employee error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch employee'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateEmployeeBody = await request.json()

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.firstName !== undefined) updateData.firstName = body.firstName
    if (body.lastName !== undefined) updateData.lastName = body.lastName
    if (body.firstNameAr !== undefined) updateData.firstNameAr = body.firstNameAr
    if (body.lastNameAr !== undefined) updateData.lastNameAr = body.lastNameAr
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.gender !== undefined) updateData.gender = body.gender
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
    if (body.nationality !== undefined) updateData.nationality = body.nationality
    if (body.address !== undefined) updateData.address = body.address
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId
    if (body.positionId !== undefined) updateData.positionId = body.positionId
    if (body.hireDate !== undefined) updateData.hireDate = new Date(body.hireDate)
    if (body.salary !== undefined) updateData.salary = body.salary
    if (body.status !== undefined) updateData.status = body.status
    if (body.fingerprintEnrolled !== undefined) updateData.fingerprintEnrolled = body.fingerprintEnrolled
    if (body.fingerprintId !== undefined) updateData.fingerprintId = body.fingerprintId
    if (body.photo !== undefined) updateData.photo = body.photo
    if (body.bankName !== undefined) updateData.bankName = body.bankName
    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount
    if (body.notes !== undefined) updateData.notes = body.notes

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: {
          select: { id: true, name: true, nameAr: true },
        },
        position: {
          select: { id: true, title: true, titleAr: true },
        },
      },
    })

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Update employee error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update employee'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Soft delete - set status to TERMINATED
    const employee = await db.employee.update({
      where: { id },
      data: { status: 'TERMINATED' },
    })

    return NextResponse.json({ employee, message: 'Employee terminated successfully' })
  } catch (error) {
    console.error('Delete employee error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete employee'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
