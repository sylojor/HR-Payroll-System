import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface CreateHolidayBody {
  name: string
  nameAr?: string
  date: string
  type?: string
  recurring?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (year) {
      const yearNum = parseInt(year, 10)
      const yearStart = new Date(yearNum, 0, 1)
      const yearEnd = new Date(yearNum, 11, 31)
      where.date = { gte: yearStart, lte: yearEnd }
    }

    if (type) {
      where.type = type
    }

    const holidays = await db.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ holidays })
  } catch (error) {
    console.error('Holidays list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch holidays'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateHolidayBody = await request.json()

    if (!body.name || !body.date) {
      return NextResponse.json(
        { error: 'Holiday name and date are required' },
        { status: 400 }
      )
    }

    const holiday = await db.holiday.create({
      data: {
        name: body.name,
        nameAr: body.nameAr ?? '',
        date: new Date(body.date),
        type: body.type ?? 'PUBLIC',
        recurring: body.recurring ?? true,
      },
    })

    return NextResponse.json({ holiday }, { status: 201 })
  } catch (error) {
    console.error('Create holiday error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create holiday'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
