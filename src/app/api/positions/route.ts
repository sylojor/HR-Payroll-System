import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreatePositionBody {
  title: string
  titleAr?: string
  departmentId: string
  minSalary?: number
  maxSalary?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')

    const where: Record<string, unknown> = {}
    if (departmentId) {
      where.departmentId = departmentId
    }

    const positions = await db.position.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, nameAr: true },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json({
      positions: positions.map(p => ({
        ...p,
        employeeCount: p._count.employees,
      })),
    })
  } catch (error) {
    console.error('Positions list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch positions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePositionBody = await request.json()

    if (!body.title || !body.departmentId) {
      return NextResponse.json(
        { error: 'Title and departmentId are required' },
        { status: 400 }
      )
    }

    // Verify department exists
    const department = await db.department.findUnique({
      where: { id: body.departmentId },
    })
    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    const position = await db.position.create({
      data: {
        title: body.title,
        titleAr: body.titleAr ?? '',
        departmentId: body.departmentId,
        minSalary: body.minSalary ?? 0,
        maxSalary: body.maxSalary ?? 0,
      },
      include: {
        department: {
          select: { id: true, name: true, nameAr: true },
        },
      },
    })

    return NextResponse.json({ position }, { status: 201 })
  } catch (error) {
    console.error('Create position error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create position'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
