import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreateDepartmentBody {
  name: string
  nameAr?: string
  description?: string
  managerId?: string
}

export async function GET() {
  try {
    const departments = await db.department.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      departments: departments.map(d => ({
        ...d,
        employeeCount: d._count.employees,
      })),
    })
  } catch (error) {
    console.error('Departments list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch departments'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateDepartmentBody = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      )
    }

    const department = await db.department.create({
      data: {
        name: body.name,
        nameAr: body.nameAr ?? '',
        description: body.description ?? '',
        managerId: body.managerId ?? '',
      },
    })

    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    console.error('Create department error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create department'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
