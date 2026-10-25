import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import path from 'path'
import fs   from 'fs/promises'
import { prisma } from '@/lib/db.js'
import { MEDIA_DIR, MIME_EXT, MAX_BYTES } from '@/lib/inbox.js'

// multipart/form-data, one or more "file" fields
export async function POST(req, { params }) {
  const { id } = await params
  const item = await prisma.inboxItem.findUnique({ where: { id: Number(id) } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const files = (await req.formData()).getAll('file').filter(f => typeof f === 'object')
  if (!files.length) return NextResponse.json({ error: 'file required' }, { status: 400 })
  for (const f of files) {
    if (!MIME_EXT[f.type]) return NextResponse.json({ error: `unsupported type ${f.type}` }, { status: 415 })
    if (f.size > MAX_BYTES) return NextResponse.json({ error: 'file > 10 MB' }, { status: 413 })
  }

  await fs.mkdir(/*turbopackIgnore: true*/ MEDIA_DIR, { recursive: true })
  const created = []
  for (const f of files) {
    const file = `${randomUUID()}.${MIME_EXT[f.type]}`
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ MEDIA_DIR, file), Buffer.from(await f.arrayBuffer()))
    const m = await prisma.inboxMedia.create({ data: { itemId: item.id, file, mime: f.type } })
    created.push({ id: m.id, mime: m.mime, url: `/api/inbox/media/${file}` })
  }
  return NextResponse.json(created)
}
