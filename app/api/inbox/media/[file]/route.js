import { NextResponse } from 'next/server'
import path from 'path'
import fs   from 'fs/promises'
import { prisma } from '@/lib/db.js'
import { MEDIA_DIR, FILE_RE } from '@/lib/inbox.js'

export async function GET(_req, { params }) {
  const { file } = await params
  if (!FILE_RE.test(file)) return NextResponse.json({ error: 'bad name' }, { status: 400 })
  const row = await prisma.inboxMedia.findFirst({ where: { file } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const buf = await fs.readFile(path.join(MEDIA_DIR, file))
    return new NextResponse(buf, {
      headers: {
        'Content-Type': row.mime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req, { params }) {
  const { file } = await params
  if (!FILE_RE.test(file)) return NextResponse.json({ error: 'bad name' }, { status: 400 })
  const row = await prisma.inboxMedia.findFirst({ where: { file } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.inboxMedia.delete({ where: { id: row.id } })
  await fs.unlink(path.join(MEDIA_DIR, file)).catch(() => {})
  return NextResponse.json({ ok: true })
}
