import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

function getDbPath(): string | null {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl.startsWith('file:')) return null

  let filePath = dbUrl.replace(/^file:/, '')
  if (filePath.startsWith('///')) filePath = filePath.slice(2)
  else if (filePath.startsWith('//')) filePath = filePath.slice(1)
  if (process.platform === 'win32' && filePath.match(/^\/[A-Za-z]:\//)) filePath = filePath.slice(1)
  if (path.isAbsolute(filePath)) return filePath
  return path.resolve(process.cwd(), filePath.replace(/^\.\//, ''))
}

interface LoginBody {
  username: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginBody = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    let user
    try {
      user = await db.user.findUnique({
        where: { username },
      })
    } catch (dbError) {
      console.error('Database error during login:', dbError)
      const msg = dbError instanceof Error ? dbError.message : ''

      // If tables don't exist, try to auto-initialize
      if (msg.includes('does not exist') || msg.includes('no such table') || msg.includes('Error code 14')) {
        try {
          const dbPath = getDbPath()
          if (dbPath) {
            const dbDir = path.dirname(dbPath)
            if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
            if (!existsSync(dbPath)) writeFileSync(dbPath, '')
          }
          console.log('[auth] Auto-initializing database...')
          const result = await new Promise<boolean>((resolve) => {
            exec('npx prisma db push --accept-data-loss --skip-generate', {
              timeout: 120000,
              env: { ...process.env },
            }, (error) => {
              if (error) {
                console.error('[auth] Auto-init failed:', error.message)
                resolve(false)
              } else {
                resolve(true)
              }
            })
          })
          if (result) {
            // Retry the query after initialization
            user = await db.user.findUnique({ where: { username } })
          }
        } catch (initError) {
          console.error('[auth] Auto-init failed:', initError)
        }
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Unable to connect to the database. Please use the "Initialize Database" option on the login screen.', needsDbInit: true },
          { status: 503 }
        )
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      )
    }

    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Update last login
    try {
      await db.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })
    } catch {
      // Non-critical - don't fail login if this update fails
    }

    // Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          details: `User ${username} logged in`,
        },
      })
    } catch {
      // Non-critical - don't fail login if audit log fails
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error('Auth error:', error)

    // Provide user-friendly error messages
    if (error instanceof Error) {
      const msg = error.message
      if (msg.includes('Error code 14') || msg.includes('Unable to open the database file')) {
        return NextResponse.json(
          { error: 'Unable to connect to the database. Please restart the application and try again.' },
          { status: 503 }
        )
      }
      if (msg.includes('does not exist') || msg.includes('no such table')) {
        return NextResponse.json(
          { error: 'Database not initialized. Please set up the application first.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 500 })
  }
}
