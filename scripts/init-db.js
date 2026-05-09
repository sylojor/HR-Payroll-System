/**
 * Database Initialization Script
 *
 * This script creates all database tables using better-sqlite3 directly.
 * It's designed to be run by the Electron main.js BEFORE starting the Next.js server.
 *
 * Usage: node scripts/init-db.js <databaseFilePath>
 *
 * This avoids all the issues with:
 * - "npx is not recognized" (no npx needed)
 * - "Error code 14" (no Prisma URL parsing, direct file path)
 * - CLI tools not available in production build
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.argv[2];

if (!dbPath) {
  console.error('[init-db] ERROR: Database path not provided');
  console.error('[init-db] Usage: node scripts/init-db.js <databaseFilePath>');
  process.exit(1);
}

console.log('[init-db] Database path:', dbPath);

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('[init-db] Created directory:', dbDir);
}

// Ensure database file exists (empty file is fine, SQLite will initialize it)
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '');
  console.log('[init-db] Created empty database file:', dbPath);
}

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
];

try {
  console.log('[init-db] Opening database with better-sqlite3...');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create all tables in a transaction
  const createAll = sqlite.transaction(() => {
    for (const sql of CREATE_TABLE_SQL) {
      sqlite.exec(sql);
    }
  });
  createAll();

  // Verify tables were created
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tableNames = tables.map(t => t.name);
  console.log('[init-db] Tables created:', tableNames.join(', '));

  sqlite.close();
  console.log('[init-db] ✅ Database initialization completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('[init-db] ❌ Database initialization failed:', error.message);
  console.error('[init-db] Stack:', error.stack);
  process.exit(1);
}
