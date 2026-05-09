import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

function getDbPath(): string | null {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl.startsWith('file:')) return null

  let filePath = dbUrl.replace(/^file:/, '')

  if (filePath.startsWith('///')) {
    filePath = filePath.slice(2)
  } else if (filePath.startsWith('//')) {
    filePath = filePath.slice(1)
  }

  if (process.platform === 'win32') {
    if (filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1)
    }
  }

  if (path.isAbsolute(filePath)) return filePath
  return path.resolve(process.cwd(), filePath.replace(/^\.\//, ''))
}

function runPrismaDbPush(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    exec('npx prisma db push --accept-data-loss --skip-generate', {
      timeout: 120000,
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('[db-init] prisma db push failed:', error.message)
        console.error('[db-init] stderr:', stderr)
        resolve({ success: false, error: error.message.substring(0, 300) })
      } else {
        console.log('[db-init] prisma db push completed successfully')
        resolve({ success: true })
      }
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const seed = body.seed === true
    const seedOnly = body.seedOnly === true

    // Step 1: Ensure database directory exists and create empty file if needed
    const dbPath = getDbPath()
    if (dbPath) {
      const dbDir = path.dirname(dbPath)
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true })
        console.log('[db-init] Created database directory:', dbDir)
      }
      if (!existsSync(dbPath)) {
        writeFileSync(dbPath, '')
        console.log('[db-init] Created empty database file:', dbPath)
      }
    }

    if (seedOnly) {
      // Just seed data, don't run prisma db push
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

    // Step 2: Run prisma db push to create tables (async)
    const pushResult = await runPrismaDbPush()
    if (!pushResult.success) {
      return NextResponse.json(
        { error: 'Failed to initialize database schema: ' + pushResult.error },
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
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } })
    if (existingAdmin) {
      return { adminExisted: true, user: { username: 'admin' } }
    }

    // Create default admin user
    const admin = await prisma.user.create({
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
    const existingCompany = await prisma.company.findFirst()
    if (!existingCompany) {
      await prisma.company.create({
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
    const existingSettings = await prisma.settings.findFirst()
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
        await prisma.settings.create({ data: setting })
      }
    }

    // Create default fingerprint license if none exists
    const existingLicense = await prisma.license.findFirst({ where: { module: 'FINGERPRINT' } })
    if (!existingLicense) {
      await prisma.license.create({
        data: {
          key: 'FREE-FINGERPRINT-3',
          module: 'FINGERPRINT',
          maxDevices: 3,
          activatedDevices: 0,
          activatedAt: new Date(),
          isActive: true,
          companyName: 'My Company',
          contactEmail: '',
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
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
    await prisma.$disconnect()
  }
}
