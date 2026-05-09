import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreateEmployeeBody {
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  email?: string
  phone?: string
  gender?: string
  dateOfBirth?: string
  nationality?: string
  address?: string
  emergencyContact?: string
  departmentId: string
  positionId: string
  hireDate: string
  salary: number
  status?: string
  bankName?: string
  bankAccount?: string
  notes?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const departmentId = searchParams.get('departmentId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (departmentId) {
      where.departmentId = departmentId
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { firstNameAr: { contains: search } },
        { lastNameAr: { contains: search } },
        { employeeId: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const employees = await db.employee.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, nameAr: true },
        },
        position: {
          select: { id: true, title: true, titleAr: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Employees list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch employees'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEmployeeBody = await request.json()

    if (!body.firstName || !body.lastName || !body.departmentId || !body.positionId || !body.hireDate) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, departmentId, positionId, hireDate' },
        { status: 400 }
      )
    }

    // Verify department exists
    const department = await db.department.findUnique({ where: { id: body.departmentId } })
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Verify position exists
    const position = await db.position.findUnique({ where: { id: body.positionId } })
    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // Auto-generate employeeId
    const lastEmployee = await db.employee.findFirst({
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    })

    let nextNumber = 1
    if (lastEmployee) {
      const match = lastEmployee.employeeId.match(/EMP-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
    const employeeId = `EMP-${String(nextNumber).padStart(3, '0')}`

    const employee = await db.employee.create({
      data: {
        employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        firstNameAr: body.firstNameAr ?? '',
        lastNameAr: body.lastNameAr ?? '',
        email: body.email ?? '',
        phone: body.phone ?? '',
        gender: body.gender ?? 'MALE',
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        nationality: body.nationality ?? '',
        address: body.address ?? '',
        emergencyContact: body.emergencyContact ?? '',
        departmentId: body.departmentId,
        positionId: body.positionId,
        hireDate: new Date(body.hireDate),
        salary: body.salary ?? 0,
        status: body.status ?? 'ACTIVE',
        bankName: body.bankName ?? '',
        bankAccount: body.bankAccount ?? '',
        notes: body.notes ?? '',
      },
      include: {
        department: {
          select: { id: true, name: true, nameAr: true },
        },
        position: {
          select: { id: true, title: true, titleAr: true },
        },
      },
    })

    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    console.error('Create employee error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create employee'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
