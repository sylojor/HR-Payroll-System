/**
 * Database Schema Initialization Utility
 *
 * Creates all database tables using raw SQL via Prisma's $executeRawUnsafe.
 *
 * IMPORTANT: The primary database initialization method is the template.db
 * file bundled with the Electron app. This module serves as a fallback
 * for cases where the template database is not available.
 *
 * CRITICAL FIX (v1.11.0): Windows DATABASE_URL format
 * - Prisma with better-sqlite3 on Windows requires file:C:/path format
 * - file:///C:/path (triple-slash) causes Error code 14: Unable to open database file
 * - Both electron/main.js and src/lib/db.ts now use file:C:/path format
 * - This module also normalizes the URL before creating PrismaClient
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * Normalize DATABASE_URL to the format Prisma expects on the current platform.
 * On Windows: file:///C:/path or file://C:/path -> file:C:/path
 * On Unix: file:///path -> file:/path
 *
 * This is called before any PrismaClient instantiation.
 */
export function normalizeDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl.startsWith('file:')) return dbUrl

  const urlAfterFile = dbUrl.slice(5) // Remove 'file:'

  if (process.platform === 'win32') {
    // Windows: file:///C:/path -> file:C:/path
    if (urlAfterFile.match(/^\/\/\/[A-Za-z]:\//)) {
      const fixedUrl = 'file:' + urlAfterFile.replace(/^\/\/+/, '')
      console.log('[db-schema] Normalizing DATABASE_URL:', dbUrl, '->', fixedUrl)
      process.env.DATABASE_URL = fixedUrl
      return fixedUrl
    }
    // Windows: file://C:/path -> file:C:/path
    if (urlAfterFile.match(/^\/\/[A-Za-z]:\//)) {
      const fixedUrl = 'file:' + urlAfterFile.replace(/^\/+/, '')
      console.log('[db-schema] Normalizing DATABASE_URL:', dbUrl, '->', fixedUrl)
      process.env.DATABASE_URL = fixedUrl
      return fixedUrl
    }
  }

  return dbUrl
}

/**
 * Extract the filesystem path from DATABASE_URL env variable.
 * Handles all common SQLite URL formats on both Windows and Unix.
 */
export function getDbFilePath(): string | null {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl.startsWith('file:')) return null

  let filePath = dbUrl.replace(/^file:/, '')

  // Handle file:///C:/path (Windows absolute - three slashes before drive letter)
  if (filePath.startsWith('///')) {
    filePath = filePath.slice(2) // ///C:/path -> /C:/path
    if (process.platform === 'win32' && filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1) // /C:/path -> C:/path
    }
  }
  // Handle file://path (two slashes)
  else if (filePath.startsWith('//')) {
    filePath = filePath.slice(1) // //path -> /path
    if (process.platform === 'win32' && filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1)
    }
  }
  // Handle file:/C:/path or file:/path (single slash)
  else if (filePath.startsWith('/')) {
    if (process.platform === 'win32' && filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1) // /C:/path -> C:/path
    }
    // On Unix, /path is already correct
  }

  if (path.isAbsolute(filePath)) return filePath

  // Relative path - resolve from cwd
  return path.resolve(process.cwd(), filePath.replace(/^\.\//, ''))
}

/**
 * Ensure the database file and its parent directory exist.
 */
export function ensureDatabaseFile(): string | null {
  const dbPath = getDbFilePath()
  if (!dbPath) {
    console.error('[db-schema] Cannot determine database path - DATABASE_URL not set or not file: protocol')
    return null
  }

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

  `CREATE TABLE IF NOT EXISTS Settings (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general'
  )`,

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

  `CREATE TABLE IF NOT EXISTS Department (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nameAr TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    managerId TEXT NOT NULL DEFAULT '',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

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

  `CREATE TABLE IF NOT EXISTS Shift (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nameAr TEXT NOT NULL DEFAULT '',
    startTime TEXT NOT NULL DEFAULT '08:00',
    endTime TEXT NOT NULL DEFAULT '17:00',
    graceMinutes INTEGER NOT NULL DEFAULT 15,
    overtimeThreshold REAL NOT NULL DEFAULT 8.0,
    isDefault BOOLEAN NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#14B8A6',
    daysOfWeek TEXT NOT NULL DEFAULT '0,1,2,3,4',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

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
    shiftId TEXT NOT NULL DEFAULT '',
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
    FOREIGN KEY (positionId) REFERENCES Position(id),
    FOREIGN KEY (shiftId) REFERENCES Shift(id)
  )`,

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

  `CREATE TABLE IF NOT EXISTS AuditLog (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entityId TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

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

  `CREATE TABLE IF NOT EXISTS LeaveBalance (
    id TEXT PRIMARY KEY NOT NULL,
    employeeId TEXT NOT NULL,
    typeId TEXT NOT NULL,
    totalDays REAL NOT NULL DEFAULT 0,
    usedDays REAL NOT NULL DEFAULT 0,
    remainingDays REAL NOT NULL DEFAULT 0,
    year INTEGER NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES Employee(id),
    FOREIGN KEY (typeId) REFERENCES LeaveType(id)
  )`,
]

/**
 * Create all database tables using Prisma's $executeRawUnsafe.
 *
 * This is the FALLBACK method. The primary method is the template.db
 * file bundled with the Electron app, which is copied on first launch.
 *
 * CRITICAL: Before creating any PrismaClient, we normalize the DATABASE_URL
 * on Windows from file:///C:/path to file:C:/path. Without this,
 * Prisma fails with "Error code 14: Unable to open the database file".
 */
export async function createAllTables(): Promise<{ success: boolean; error?: string; dbPath?: string }> {
  // Step 1: Normalize DATABASE_URL (fix Windows file:///C:/ -> file:C:/)
  normalizeDatabaseUrl()

  // Step 2: Ensure database file exists
  const dbPath = ensureDatabaseFile()

  if (!dbPath) {
    return { success: false, error: 'Cannot determine database path from DATABASE_URL' }
  }

  // Step 3: Create tables via Prisma
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    try {
      for (const sql of CREATE_TABLE_SQL) {
        await prisma.$executeRawUnsafe(sql)
      }
      console.log('[db-schema] All database tables created/verified successfully ✅')
      return { success: true, dbPath }
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[db-schema] Failed to create tables via Prisma:', message)

    // Last resort: try constructing URL from the file path directly
    try {
      const fixedPath = getDbFilePath()
      if (fixedPath) {
        const fixedUrl = 'file:' + fixedPath.replace(/\\/g, '/')
        console.log('[db-schema] Last resort: trying URL from file path:', fixedUrl)

        process.env.DATABASE_URL = fixedUrl
        const { PrismaClient } = await import('@prisma/client')
        const prisma = new PrismaClient()

        try {
          for (const sql of CREATE_TABLE_SQL) {
            await prisma.$executeRawUnsafe(sql)
          }
          console.log('[db-schema] Tables created with constructed URL ✅')
          // Keep the working URL in env so subsequent PrismaClient uses it too
          return { success: true, dbPath }
        } finally {
          await prisma.$disconnect()
        }
      }

      return { success: false, error: message, dbPath }
    } catch (altError) {
      const altMsg = altError instanceof Error ? altError.message : 'Unknown error'
      console.error('[db-schema] Constructed URL also failed:', altMsg)
      return { success: false, error: `Primary: ${message}. Alt: ${altMsg}. DB path: ${dbPath}`, dbPath }
    }
  }
}
