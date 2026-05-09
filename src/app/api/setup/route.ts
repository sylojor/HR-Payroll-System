import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createAllTables, ensureDatabaseFile } from '@/lib/db-schema'

/**
 * Try to ensure database schema exists by creating tables using raw SQL.
 * No dependency on npx or prisma CLI - works in Electron production builds.
 */
async function ensureDatabaseSchema(): Promise<boolean> {
  try {
    // First, ensure the database file exists
    ensureDatabaseFile()

    // Try a simple query to see if tables exist
    await db.user.count()
    return true
  } catch {
    // Tables don't exist - create them using raw SQL
    try {
      console.log('[setup] Database tables not found, creating via raw SQL...')
      const result = await createAllTables(db)
      if (result.success) {
        console.log('[setup] Database tables created successfully')
        return true
      }
      console.error('[setup] Failed to create tables:', result.error)
      return false
    } catch (createError) {
      console.error('[setup] Table creation failed:', createError)
      return false
    }
  }
}

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
    // Ensure database schema exists before trying to query
    const schemaReady = await ensureDatabaseSchema()
    if (!schemaReady) {
      return NextResponse.json(
        { error: 'Unable to initialize the database schema. Please restart the application and try again.' },
        { status: 503 }
      )
    }

    // Check if any users exist - if yes, setup already done
    let userCount = 0
    try {
      userCount = await db.user.count()
    } catch (dbError) {
      console.error('Database connection error during setup check:', dbError)
      return NextResponse.json(
        { error: 'Unable to connect to the database. Please restart the application and try again.' },
        { status: 503 }
      )
    }

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

    // Provide user-friendly error messages
    if (error instanceof Error) {
      const msg = error.message

      // Database connectivity errors
      if (msg.includes('Error code 14') || msg.includes('Unable to open the database file')) {
        return NextResponse.json(
          { error: 'Unable to connect to the database. Please use the "Initialize Database" option on the login screen.' },
          { status: 503 }
        )
      }

      // Table doesn't exist errors
      if (msg.includes('does not exist') || msg.includes('no such table')) {
        return NextResponse.json(
          { error: 'Database tables not found. Please use the "Initialize Database" option on the login screen.' },
          { status: 503 }
        )
      }

      // Unique constraint violation
      if (msg.includes('Unique constraint') || msg.includes('already exists')) {
        return NextResponse.json(
          { error: 'A user with this username already exists.' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ error: 'Setup failed. Please try again.' }, { status: 500 })
  }
}
