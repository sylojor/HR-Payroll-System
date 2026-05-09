import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createAllTables, ensureDatabaseFile } from '@/lib/db-schema'

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

      // If tables don't exist, try to auto-initialize using raw SQL
      if (msg.includes('does not exist') || msg.includes('no such table') || msg.includes('Error code 14')) {
        try {
          console.log('[auth] Auto-initializing database via raw SQL...')
          ensureDatabaseFile()
          const result = await createAllTables(db)
          if (result.success) {
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
