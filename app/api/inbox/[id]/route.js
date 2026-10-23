import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'
import { serialize, unlinkMedia } from '@/lib/inbox.js'

export async function PATCH(req, { params }) {
  const { id } = await params
  const { text, body } = await req.json()
  const data = {}
  if (text !== undefined) {
    if (typeof text !== 'string' || !text.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })
    data.text = text.trim()
  }
  if (body !== undefined) {
    if (body !== null && typeof body !== 'string') return NextResponse.json({ error: 'body must be a string' }, { status: 400 })
    data.body = body?.trim() || null
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  try {
    const item = await prisma.inboxItem.update({
      where: { id: Number(id) }, data, include: { media: true },
    })
    return NextResponse.json(serialize(item))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req, { params }) {
  const { id } = await params
  try {
    const media = await prisma.inboxMedia.findMany({ where: { itemId: Number(id) } })
    await prisma.inboxItem.delete({ where: { id: Number(id) } })  // media rows cascade
    await unlinkMedia(media.map(m => m.file))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
