/**
 * Database Schema Initialization Utility
 *
 * Creates all database tables using raw SQL instead of `npx prisma db push`.
 * This is necessary because `npx` is not available in the Electron production build.
 *
 * Uses Prisma's $executeRawUnsafe to send CREATE TABLE IF NOT EXISTS statements
 * directly to SQLite, bypassing the need for any CLI tools.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * Extract the filesystem path from DATABASE_URL env variable
 */
export function getDbFilePath(): string | null {
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

/**
 * Ensure the database file and its parent directory exist.
 * Creates an empty file if it doesn't exist so SQLite can connect.
 */
export function ensureDatabaseFile(): string | null {
  const dbPath = getDbFilePath()
  if (!dbPath) return null

  const dbDir = path.dirname(dbPath)
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
    console.log('[db-schema] Created database directory:', dbDir)
  }
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, '')
    console.log('[db-schema] Created empty database file:', dbPath)
  }
  return dbPath
}

/**
 * All CREATE TABLE statements for the Attindo database.
 * These mirror the Prisma schema in prisma/schema.prisma.
 * Uses IF NOT EXISTS so it's safe to call multiple times.
 */
const CREATE_TABLE_SQL = [
  // Company
  `CREATE TABLE IF NOT EXISTS Company (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nameAr TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    logo TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'JOD',
    currencySymbol TEXT NOT NULL DEFAULT 'د.ا',
    fiscalYearStart TEXT NOT NULL DEFAULT '01',
    taxRate REAL NOT NULL DEFAULT 0.0,
    workingHoursPerDay REAL NOT NULL DEFAULT 8.0,
    overtimeRate REAL NOT NULL DEFAULT 1.5,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Settings
  `CREATE TABLE IF NOT EXISTS Settings (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general'
  )`,

  // User
  `CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'ADMIN',
    isActive BOOLEAN NOT NULL DEFAULT 1,
    lastLogin DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Department
  `CREATE TABLE IF NOT EXISTS Department (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nameAr TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    managerId TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Position
  `CREATE TABLE IF NOT EXISTS Position (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    titleAr TEXT NOT NULL DEFAULT '',
    departmentId TEXT NOT NULL,
    minSalary REAL NOT NULL DEFAULT 0,
    maxSalary REAL NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (departmentId) REFERENCES Department(id)
  )`,

  // Employee
  `CREATE TABLE IF NOT EXISTS Employee (
    id TEXT PRIMARY KEY NOT NULL,
    employeeId TEXT NOT NULL UNIQUE,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    firstNameAr TEXT NOT NULL DEFAULT '',
    lastNameAr TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT 'MALE',
    dateOfBirth DATETIME,
    nationality TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    emergencyContact TEXT NOT NULL DEFAULT '',
    departmentId TEXT NOT NULL,
    positionId TEXT NOT NULL,
    hireDate DATETIME NOT NULL,
    salary REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    fingerprintEnrolled BOOLEAN NOT NULL DEFAULT 0,
    fingerprintId TEXT NOT NULL DEFAULT '',
    photo TEXT NOT NULL DEFAULT '',
    bankName TEXT NOT NULL DEFAULT '',
    bankAccount TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (departmentId) REFERENCES Department(id),
    FOREIGN KEY (positionId) REFERENCES Position(id)
  )`,

  // FingerprintDevice
  `CREATE TABLE IF NOT EXISTS FingerprintDevice (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 4370,
    deviceType TEXT NOT NULL DEFAULT 'ZK',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    location TEXT NOT NULL DEFAULT '',
    lastSync DATETIME,
    sn TEXT NOT NULL DEFAULT '',
    firmware TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Attendance
  `CREATE TABLE IF NOT EXISTS Attendance (
    id TEXT PRIMARY KEY NOT NULL,
    employeeId TEXT NOT NULL,
    date DATETIME NOT NULL,
    checkIn DATETIME,
    checkOut DATETIME,
    status TEXT NOT NULL DEFAULT 'PRESENT',
    overtimeHours REAL NOT NULL DEFAULT 0,
    lateMinutes REAL NOT NULL DEFAULT 0,
    earlyLeaveMinutes REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    deviceId TEXT NOT NULL DEFAULT '',
    fingerprintMatch BOOLEAN NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES Employee(id)
  )`,

  // LeaveType
  `CREATE TABLE IF NOT EXISTS LeaveType (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nameAr TEXT NOT NULL DEFAULT '',
    defaultDays INTEGER NOT NULL DEFAULT 0,
    isPaid BOOLEAN NOT NULL DEFAULT 1,
    carryForward BOOLEAN NOT NULL DEFAULT 0,
    maxCarryDays INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Leave
  `CREATE TABLE IF NOT EXISTS Leave (
    id TEXT PRIMARY KEY NOT NULL,
    employeeId TEXT NOT NULL,
    typeId TEXT NOT NULL,
    startDate DATETIME NOT NULL,
    endDate DATETIME NOT NULL,
    days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    reason TEXT NOT NULL DEFAULT '',
    approvedBy TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES Employee(id),
    FOREIGN KEY (typeId) REFERENCES LeaveType(id)
  )`,

  // SalaryComponent
  `CREATE TABLE IF NOT EXISTS SalaryComponent (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nameAr TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    percentage REAL NOT NULL DEFAULT 0,
    isFixed BOOLEAN NOT NULL DEFAULT 1,
    isTaxable BOOLEAN NOT NULL DEFAULT 0,
    isRecurring BOOLEAN NOT NULL DEFAULT 1,
    isActive BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Payroll
  `CREATE TABLE IF NOT EXISTS Payroll (
    id TEXT PRIMARY KEY NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    generatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paidAt DATETIME,
    totalGross REAL NOT NULL DEFAULT 0,
    totalDeductions REAL NOT NULL DEFAULT 0,
    totalNet REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
  )`,

  // PayrollItem
  `CREATE TABLE IF NOT EXISTS PayrollItem (
    id TEXT PRIMARY KEY NOT NULL,
    payrollId TEXT NOT NULL,
    employeeId TEXT NOT NULL,
    basicSalary REAL NOT NULL DEFAULT 0,
    totalAllowances REAL NOT NULL DEFAULT 0,
    totalDeductions REAL NOT NULL DEFAULT 0,
    grossSalary REAL NOT NULL DEFAULT 0,
    taxAmount REAL NOT NULL DEFAULT 0,
    netSalary REAL NOT NULL DEFAULT 0,
    daysWorked INTEGER NOT NULL DEFAULT 0,
    overtimeHours REAL NOT NULL DEFAULT 0,
    overtimeAmount REAL NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payrollId) REFERENCES Payroll(id),
    FOREIGN KEY (employeeId) REFERENCES Employee(id)
  )`,

  // License
  `CREATE TABLE IF NOT EXISTS License (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    maxDevices INTEGER NOT NULL DEFAULT 1,
    activatedDevices INTEGER NOT NULL DEFAULT 0,
    activatedAt DATETIME,
    expiresAt DATETIME,
    isActive BOOLEAN NOT NULL DEFAULT 0,
    machineId TEXT NOT NULL DEFAULT '',
    companyName TEXT NOT NULL DEFAULT '',
    contactEmail TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // AuditLog
  `CREATE TABLE IF NOT EXISTS AuditLog (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entityId TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Holiday
  `CREATE TABLE IF NOT EXISTS Holiday (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nameAr TEXT NOT NULL DEFAULT '',
    date DATETIME NOT NULL,
    type TEXT NOT NULL DEFAULT 'PUBLIC',
    recurring BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
]

/**
 * Create all database tables using raw SQL.
 * This works without `npx` or `prisma` CLI - only requires PrismaClient.
 * Safe to call multiple times (uses IF NOT EXISTS).
 *
 * @param prisma - PrismaClient instance to execute raw SQL
 * @returns true if all tables were created successfully, false otherwise
 */
export async function createAllTables(prisma: { $executeRawUnsafe: (query: string) => Promise<unknown> }): Promise<{ success: boolean; error?: string }> {
  try {
    // First ensure the database file exists
    ensureDatabaseFile()

    // Create each table
    for (const sql of CREATE_TABLE_SQL) {
      await prisma.$executeRawUnsafe(sql)
    }

    console.log('[db-schema] All database tables created/verified successfully')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[db-schema] Failed to create tables:', message)
    return { success: false, error: message }
  }
}

/**
 * Check if the database has the required tables by trying to query the User table.
 * Returns true if tables exist, false otherwise.
 */
export async function checkTablesExist(prisma: { user: { count: () => Promise<number> } }): Promise<boolean> {
  try {
    await prisma.user.count()
    return true
  } catch {
    return false
  }
}
