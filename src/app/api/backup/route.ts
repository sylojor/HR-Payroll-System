import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, rename, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

function getDbPath(): string | null {
  const dbUrl = process.env.DATABASE_URL || ''
  // Parse the SQLite file path from the DATABASE_URL
  // Possible formats:
  //   file:./db/attindo.db (relative)
  //   file:/C:/Users/.../attindo.db (absolute Windows)
  //   file:/home/.../attindo.db (absolute Unix)
  if (!dbUrl.startsWith('file:')) {
    return null
  }

  let filePath = dbUrl.replace(/^file:/, '')

  // Handle Windows absolute paths: file:/C:/Users/... -> C:/Users/...
  // On Windows, the path after file: has a leading slash before the drive letter
  if (process.platform === 'win32') {
    // file:/C:/Users/... -> /C:/Users/... -> C:/Users/...
    if (filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1)
    }
  }

  // If it's already an absolute path, return as-is
  if (path.isAbsolute(filePath)) {
    return filePath
  }

  // Relative path - resolve relative to cwd (which is the standalone dir in production)
  return path.resolve(process.cwd(), filePath.replace(/^\.\//, ''))
}

export async function GET() {
  try {
    const dbPath = getDbPath()

    if (!dbPath || !existsSync(dbPath)) {
      return NextResponse.json(
        { error: 'Database file not found' },
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
