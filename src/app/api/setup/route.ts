import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface SetupBody {
  company: {
    name: string
    nameAr: string
    address: string
    phone: string
    email: string
    currency: string
    currencySymbol: string
  }
  adminUser: {
    username: string
    password: string
    name: string
    email: string
  }
  settings: {
    workingHoursPerDay: number
    overtimeRate: number
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if any users exist - if yes, setup already done
    const userCount = await db.user.count()
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Setup has already been completed. Users already exist.' },
        { status: 400 }
      )
    }

    const body: SetupBody = await request.json()
    const { company: companyData, adminUser, settings } = body

    // Validate required fields
    if (!companyData?.name || !adminUser?.username || !adminUser?.password || !adminUser?.name) {
      return NextResponse.json(
        { error: 'Company name, admin username, password, and name are required' },
        { status: 400 }
      )
    }

    if (adminUser.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // 1. Create company
    const company = await db.company.create({
      data: {
        name: companyData.name,
        nameAr: companyData.nameAr || '',
        address: companyData.address || '',
        phone: companyData.phone || '',
        email: companyData.email || '',
        currency: companyData.currency || 'JOD',
        currencySymbol: companyData.currencySymbol || 'د.ا',
        workingHoursPerDay: settings?.workingHoursPerDay || 8.0,
        overtimeRate: settings?.overtimeRate || 1.5,
      },
    })

    // 2. Create admin user
    const user = await db.user.create({
      data: {
        username: adminUser.username,
        password: adminUser.password,
        name: adminUser.name,
        email: adminUser.email || '',
        role: 'ADMIN',
        isActive: true,
      },
    })

    // 3. Create default settings
    const settingsData = [
      { key: 'working_days', value: 'SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY', category: 'attendance' },
      { key: 'work_start_time', value: '08:00', category: 'attendance' },
      { key: 'work_end_time', value: '17:00', category: 'attendance' },
      { key: 'grace_period_minutes', value: '15', category: 'attendance' },
      { key: 'overtime_threshold_hours', value: String(settings?.workingHoursPerDay || 8), category: 'attendance' },
      { key: 'currency', value: companyData.currency || 'JOD', category: 'general' },
      { key: 'date_format', value: 'YYYY-MM-DD', category: 'general' },
      { key: 'language', value: 'en', category: 'general' },
      { key: 'company_name', value: companyData.name, category: 'general' },
      { key: 'tax_enabled', value: 'true', category: 'payroll' },
      { key: 'social_security_enabled', value: 'true', category: 'payroll' },
      { key: 'social_security_rate', value: '5', category: 'payroll' },
      { key: 'tax_rate', value: '5', category: 'payroll' },
      { key: 'payroll_cutoff_day', value: '25', category: 'payroll' },
      { key: 'auto_attendance_sync', value: 'true', category: 'fingerprint' },
      { key: 'sync_interval_minutes', value: '30', category: 'fingerprint' },
    ]
    for (const setting of settingsData) {
      await db.settings.create({ data: setting })
    }

    // 4. Create free fingerprint license
    await db.license.create({
      data: {
        key: 'FREE-FINGERPRINT-3',
        module: 'FINGERPRINT',
        maxDevices: 3,
        activatedDevices: 0,
        activatedAt: new Date(),
        isActive: true,
        companyName: company.name,
        contactEmail: company.email,
      },
    })

    // 5. Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'SETUP',
        entity: 'System',
        entityId: user.id,
        details: `System setup completed by ${user.name}`,
      },
    })

    return NextResponse.json({
      message: 'Setup completed successfully',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    })
  } catch (error) {
    console.error('Setup error:', error)
    const message = error instanceof Error ? error.message : 'Setup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
