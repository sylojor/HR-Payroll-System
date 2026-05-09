import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface UpdateSettingsBody {
  settings: { key: string; value: string }[]
}

export async function GET() {
  try {
    const settings = await db.settings.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    // Group by category
    const grouped: Record<string, { id: string; key: string; value: string }[]> = {}
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = []
      }
      grouped[setting.category].push({
        id: setting.id,
        key: setting.key,
        value: setting.value,
      })
    }

    return NextResponse.json({ settings: grouped })
  } catch (error) {
    console.error('Settings list error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateSettingsBody = await request.json()

    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const setting of body.settings) {
      if (!setting.key) continue

      const existing = await db.settings.findUnique({
        where: { key: setting.key },
      })

      if (existing) {
        const updated = await db.settings.update({
          where: { key: setting.key },
          data: { value: setting.value },
        })
        results.push(updated)
      } else {
        // Determine category from key prefix
        let category = 'general'
        if (setting.key.includes('attendance') || setting.key.includes('work')) {
          category = 'attendance'
        } else if (setting.key.includes('payroll') || setting.key.includes('tax') || setting.key.includes('social_security')) {
          category = 'payroll'
        } else if (setting.key.includes('fingerprint') || setting.key.includes('sync')) {
          category = 'fingerprint'
        }

        const created = await db.settings.create({
          data: {
            key: setting.key,
            value: setting.value,
            category,
          },
        })
        results.push(created)
      }
    }

    return NextResponse.json({ settings: results })
  } catch (error) {
    console.error('Update settings error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
