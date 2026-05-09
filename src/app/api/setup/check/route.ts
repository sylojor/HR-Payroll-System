import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({ needsSetup: userCount === 0 })
  } catch (error) {
    console.error('Check setup error:', error)

    // If there's a database error (e.g., table doesn't exist yet), assume setup is needed
    // This allows the setup wizard to show, which will create the tables and data
    const msg = error instanceof Error ? error.message : ''

    if (msg.includes('Error code 14') || msg.includes('Unable to open the database file') || msg.includes('does not exist') || msg.includes('no such table')) {
      // Database is not accessible or tables don't exist - show setup wizard
      // The setup wizard will handle creating the initial data
      return NextResponse.json({ needsSetup: true, dbError: true })
    }

    return NextResponse.json({ needsSetup: true })
  }
}
