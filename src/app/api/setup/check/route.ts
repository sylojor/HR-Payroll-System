import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({ needsSetup: userCount === 0 })
  } catch (error) {
    console.error('Check setup error:', error)

    // If there's a database error (e.g., table doesn't exist yet), try auto-initializing
    const msg = error instanceof Error ? error.message : ''

    if (msg.includes('Error code 14') || msg.includes('Unable to open the database file') || msg.includes('does not exist') || msg.includes('no such table')) {
      // Database is not accessible or tables don't exist
      // Signal to the client that it needs to initialize the database
      return NextResponse.json({
        needsSetup: true,
        dbError: true,
        message: 'Database needs initialization'
      })
    }

    return NextResponse.json({ needsSetup: true })
  }
}
