import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface UpdateCompanyBody {
  name?: string
  nameAr?: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  currency?: string
  currencySymbol?: string
  fiscalYearStart?: string
  taxRate?: number
  workingHoursPerDay?: number
  overtimeRate?: number
}

export async function GET() {
  try {
    const company = await db.company.findFirst()

    if (!company) {
      return NextResponse.json({ company: null })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Company info error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch company info'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateCompanyBody = await request.json()

    const existing = await db.company.findFirst()
    if (!existing) {
      return NextResponse.json(
        { error: 'No company found. Please seed the database first.' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr
    if (body.address !== undefined) updateData.address = body.address
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.logo !== undefined) updateData.logo = body.logo
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.currencySymbol !== undefined) updateData.currencySymbol = body.currencySymbol
    if (body.fiscalYearStart !== undefined) updateData.fiscalYearStart = body.fiscalYearStart
    if (body.taxRate !== undefined) updateData.taxRate = body.taxRate
    if (body.workingHoursPerDay !== undefined) updateData.workingHoursPerDay = body.workingHoursPerDay
    if (body.overtimeRate !== undefined) updateData.overtimeRate = body.overtimeRate

    const company = await db.company.update({
      where: { id: existing.id },
      data: updateData,
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATE_COMPANY',
        entity: 'Company',
        entityId: existing.id,
        details: 'Company information updated',
      },
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Update company error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update company'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
