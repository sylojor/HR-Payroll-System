/**
 * Prisma Client Singleton for Attindo
 *
 * CRITICAL FIX: Normalizes DATABASE_URL on Windows before creating PrismaClient.
 *
 * On Windows, Electron sets DATABASE_URL as file:///C:/path (triple-slash),
 * but Prisma with better-sqlite3 requires file:C:/path format.
 * Without this normalization, every Prisma query fails with:
 *   "Error code 14: Unable to open the database file"
 */

// Step 1: Normalize DATABASE_URL BEFORE importing PrismaClient
// This must run at module load time, before any PrismaClient is instantiated
function normalizeDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || !dbUrl.startsWith('file:')) return

  // Check if this is a Windows absolute path with triple-slash: file:///C:/...
  // The triple-slash format causes Prisma to fail on Windows with Error code 14
  const urlAfterFile = dbUrl.slice(5) // Remove 'file:'

  if (process.platform === 'win32') {
    // Windows: file:///C:/path -> file:C:/path
    // Also handles file://C:/path -> file:C:/path
    if (urlAfterFile.match(/^\/\/\/[A-Za-z]:\//)) {
      // file:///C:/path -> file:C:/path
      const fixedUrl = 'file:' + urlAfterFile.replace(/^\/\/+/, '')
      console.log(`[db] Normalizing DATABASE_URL: ${dbUrl} -> ${fixedUrl}`)
      process.env.DATABASE_URL = fixedUrl
    } else if (urlAfterFile.match(/^\/\/[A-Za-z]:\//)) {
      // file://C:/path -> file:C:/path
      const fixedUrl = 'file:' + urlAfterFile.replace(/^\/+/, '')
      console.log(`[db] Normalizing DATABASE_URL: ${dbUrl} -> ${fixedUrl}`)
      process.env.DATABASE_URL = fixedUrl
    }
  }
}

// Run normalization immediately when this module is loaded
normalizeDatabaseUrl()

// Step 2: Import and create PrismaClient with the corrected URL
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
