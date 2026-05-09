import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({ needsSetup: userCount === 0 })
  } catch (error) {
    console.error('Check setup error:', error)
    // If there's a database error (e.g., table doesn't exist yet), assume setup is needed
    return NextResponse.json({ needsSetup: true })
  }
}
