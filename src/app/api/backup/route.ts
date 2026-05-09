import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, rename, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

function getDbPath(): string | null {
  const dbUrl = process.env.DATABASE_URL || ''

  if (!dbUrl.startsWith('file:')) {
    return null
  }

  let filePath = dbUrl.replace(/^file:/, '')

  // Handle triple-slash format: file:///home/... -> /home/...
  if (filePath.startsWith('///')) {
    filePath = filePath.slice(2) // Keep one leading slash for Unix
  }
  // Handle double-slash format: file://C:/... -> C:/... (Windows network path)
  else if (filePath.startsWith('//')) {
    filePath = filePath.slice(1) // Keep one slash
  }

  // Handle Windows absolute paths: file:/C:/Users/... -> C:/Users/...
  // On Windows, the path after file: has a leading slash before the drive letter
  if (process.platform === 'win32') {
    if (filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1)
    }
  }

  // If it's already an absolute path, return as-is
  if (path.isAbsolute(filePath)) {
    return filePath
  }

  // Relative path - resolve relative to cwd
  return path.resolve(process.cwd(), filePath.replace(/^\.\//, ''))
}

/**
 * Ensure the database file exists and the directory is writable.
 * This is a safety check before performing backup/restore operations.
 */
async function ensureDatabaseAccessible(): Promise<string | null> {
  const dbPath = getDbPath()

  if (!dbPath) {
    console.error('[backup] Cannot determine database path from DATABASE_URL:', process.env.DATABASE_URL)
    return null
  }

  // Check if the parent directory exists
  const dbDir = path.dirname(dbPath)
  if (!existsSync(dbDir)) {
    try {
      await mkdir(dbDir, { recursive: true })
      console.log('[backup] Created database directory:', dbDir)
    } catch (err) {
      console.error('[backup] Failed to create database directory:', dbDir, err)
      return null
    }
  }

  if (!existsSync(dbPath)) {
    console.error('[backup] Database file does not exist at:', dbPath)
    return null
  }

  return dbPath
}

export async function GET() {
  try {
    const dbPath = await ensureDatabaseAccessible()

    if (!dbPath) {
      return NextResponse.json(
        { error: 'Database file not found. Please ensure the application is properly set up.' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(dbPath)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `attindo-backup-${timestamp}.db`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Backup download error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create backup'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No backup file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.db')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .db files are accepted.' },
        { status: 400 }
      )
    }

    const dbPath = getDbPath()

    if (!dbPath) {
      return NextResponse.json(
        { error: 'Cannot determine database path. Cannot restore.' },
        { status: 404 }
      )
    }

    // Read the uploaded file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate it's a SQLite file (magic number: "SQLite format 3\000")
    const magicNumber = buffer.subarray(0, 16).toString('ascii')
    if (!magicNumber.startsWith('SQLite format 3')) {
      return NextResponse.json(
        { error: 'Invalid database file. The file is not a valid SQLite database.' },
        { status: 400 }
      )
    }

    // Ensure the parent directory exists
    const dbDir = path.dirname(dbPath)
    if (!existsSync(dbDir)) {
      await mkdir(dbDir, { recursive: true })
    }

    // Create backup of current database before overwriting
    const backupPath = dbPath + '.pre-restore.bak'
    if (existsSync(dbPath)) {
      await rename(dbPath, backupPath)
    }

    try {
      // Write the new database
      await writeFile(dbPath, buffer)

      // Remove the old backup after successful write
      if (existsSync(backupPath)) {
        await unlink(backupPath)
      }

      return NextResponse.json({
        message: 'Database restored successfully. Please refresh the page to see the changes.',
      })
    } catch (writeError) {
      // If write failed, restore the backup
      if (existsSync(backupPath)) {
        await rename(backupPath, dbPath)
      }
      throw writeError
    }
  } catch (error) {
    console.error('Restore error:', error)
    const message = error instanceof Error ? error.message : 'Failed to restore backup'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
