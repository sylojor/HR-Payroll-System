import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { existsSync, statSync } from 'fs'
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

export async function GET() {
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    database: {
      url: string
      path: string | null
      fileExists: boolean
      fileSize: number | null
      canConnect: boolean
      canQuery: boolean
      userCount: number | null
      tableCheck: Record<string, boolean>
    }
    errors: string[]
  } = {
    status: 'healthy',
    database: {
      url: process.env.DATABASE_URL || 'NOT SET',
      path: null,
      fileExists: false,
      fileSize: null,
      canConnect: false,
      canQuery: false,
      userCount: null,
      tableCheck: {},
    },
    errors: [],
  }

  // Check file system
  const dbPath = getDbPath()
  health.database.path = dbPath

  if (dbPath) {
    health.database.fileExists = existsSync(dbPath)
    if (health.database.fileExists) {
      try {
        const stat = statSync(dbPath)
        health.database.fileSize = stat.size
        if (stat.size === 0) {
          health.errors.push('Database file is empty (0 bytes)')
          health.status = 'unhealthy'
        }
      } catch (err) {
        health.errors.push(`Cannot stat database file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    } else {
      health.errors.push('Database file does not exist')
      health.status = 'unhealthy'
    }
  } else {
    health.errors.push('Cannot determine database path from DATABASE_URL')
    health.status = 'unhealthy'
  }

  // Check database connectivity
  try {
    await db.$connect()
    health.database.canConnect = true
  } catch (err) {
    health.database.canConnect = false
    health.errors.push(`Cannot connect: ${err instanceof Error ? err.message : 'Unknown error'}`)
    health.status = 'unhealthy'
  }

  // Check basic queries
  if (health.database.canConnect) {
    try {
      const count = await db.user.count()
      health.database.canQuery = true
      health.database.userCount = count
    } catch (err) {
      health.database.canQuery = false
      const msg = err instanceof Error ? err.message : 'Unknown error'
      health.errors.push(`Cannot query users table: ${msg}`)
      if (msg.includes('does not exist') || msg.includes('no such table')) {
        health.status = 'unhealthy'
      } else {
        health.status = 'degraded'
      }
    }

    // Check critical tables
    const tables = ['User', 'Company', 'Settings', 'Employee', 'Department', 'Attendance']
    for (const table of tables) {
      try {
        // @ts-expect-error - dynamic model access
        await db[table].count()
        health.database.tableCheck[table] = true
      } catch {
        health.database.tableCheck[table] = false
        health.errors.push(`Table ${table} is not accessible`)
      }
    }
  }

  return NextResponse.json(health)
}
