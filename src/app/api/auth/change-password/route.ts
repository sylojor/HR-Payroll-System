import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface ChangePasswordBody {
  userId: string
  currentPassword: string
  newPassword: string
}

export async function PUT(request: NextRequest) {
  try {
    const body: ChangePasswordBody = await request.json()
    const { userId, currentPassword, newPassword } = body

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'User ID, current password, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Find user
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    if (user.password !== currentPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { password: newPassword },
    })

    // Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_CHANGE',
          entity: 'User',
          entityId: user.id,
          details: `User ${user.username} changed their password`,
        },
      })
    } catch {
      // Non-critical
    }

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Change password error:', error)

    if (error instanceof Error) {
      const msg = error.message
      if (msg.includes('Error code 14') || msg.includes('Unable to open the database file')) {
        return NextResponse.json(
          { error: 'Unable to connect to the database. Please try again.' },
          { status: 503 }
        )
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to change password'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
