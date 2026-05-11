import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createAllTables, ensureDatabaseFile, getDbFilePath } from '@/lib/db-schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const seed = body.seed === true
    const seedOnly = body.seedOnly === true

    // Step 1: Ensure database file exists
    const dbPath = ensureDatabaseFile()
    console.log('[db-init] Database path:', dbPath || 'UNKNOWN')
    console.log('[db-init] DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET')

    if (seedOnly) {
      // Just seed data, don't create tables
      try {
        const seedResult = await seedDefaultData()
        return NextResponse.json({
          success: true,
          message: 'Default admin user created successfully',
          ...seedResult,
        })
      } catch (seedError) {
        console.error('[db-init] Seed error:', seedError)
        return NextResponse.json(
          { error: 'Failed to seed default data: ' + (seedError instanceof Error ? seedError.message : 'Unknown error') },
          { status: 500 }
        )
      }
    }

    // Step 2: Create all tables using better-sqlite3 directly (bypasses Prisma!)
    const createResult = await createAllTables()
    if (!createResult.success) {
      return NextResponse.json(
        { error: 'Failed to initialize database schema: ' + (createResult.error || 'Unknown error') },
        { status: 500 }
      )
    }

    // Step 3: Optionally seed default admin
    if (seed) {
      try {
        const seedResult = await seedDefaultData()
        return NextResponse.json({
          success: true,
          message: 'Database initialized with default admin user',
          dbPath: createResult.dbPath,
          ...seedResult,
        })
      } catch (seedError) {
        console.error('[db-init] Seed error:', seedError)
        return NextResponse.json({
          success: true,
          message: 'Database initialized but failed to create default admin',
          seedError: seedError instanceof Error ? seedError.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully',
      dbPath: createResult.dbPath,
    })
  } catch (error) {
    console.error('[db-init] Error:', error)
    return NextResponse.json(
      { error: 'Database initialization failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

async function seedDefaultData() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.user.findUnique({ where: { username: 'admin' } })
    if (existingAdmin) {
      return { adminExisted: true, user: { username: 'admin' } }
    }

    // Create default admin user
    const admin = await db.user.create({
      data: {
        username: 'admin',
        password: 'admin123',
        name: 'Administrator',
        email: 'admin@attindo.com',
        role: 'ADMIN',
        isActive: true,
      },
    })

    // Create default company if none exists
    const existingCompany = await db.company.findFirst()
    if (!existingCompany) {
      await db.company.create({
        data: {
          name: 'My Company',
          nameAr: 'شركتي',
          address: '',
          phone: '',
          email: '',
          currency: 'JOD',
          currencySymbol: 'د.ا',
          workingHoursPerDay: 8.0,
          overtimeRate: 1.5,
        },
      })
    }

    // Create default settings if none exist
    const existingSettings = await db.settings.findFirst()
    if (!existingSettings) {
      const settingsData = [
        { key: 'working_days', value: 'SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY', category: 'attendance' },
        { key: 'work_start_time', value: '08:00', category: 'attendance' },
        { key: 'work_end_time', value: '17:00', category: 'attendance' },
        { key: 'grace_period_minutes', value: '15', category: 'attendance' },
        { key: 'overtime_threshold_hours', value: '8', category: 'attendance' },
        { key: 'currency', value: 'JOD', category: 'general' },
        { key: 'date_format', value: 'YYYY-MM-DD', category: 'general' },
        { key: 'language', value: 'en', category: 'general' },
        { key: 'company_name', value: 'My Company', category: 'general' },
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
    }

    // Create default fingerprint license if none exists (6 devices free)
    const existingLicense = await db.license.findFirst({ where: { module: 'FINGERPRINT' } })
    if (!existingLicense) {
      await db.license.create({
        data: {
          key: 'FREE-FINGERPRINT-6',
          module: 'FINGERPRINT',
          maxDevices: 6,
          activatedDevices: 0,
          activatedAt: new Date(),
          isActive: true,
          companyName: 'My Company',
          contactEmail: '',
        },
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: 'SETUP',
        entity: 'System',
        entityId: admin.id,
        details: 'System initialized with default admin user',
      },
    })

    return {
      adminExisted: false,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    }
  } finally {
    // Don't disconnect - we're using a shared PrismaClient
  }
}
