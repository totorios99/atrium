import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'
import { serialize } from '@/lib/inbox.js'

export async function GET() {
  const items = await prisma.inboxItem.findMany({
    orderBy: { createdAt: 'desc' },
    include: { media: { orderBy: { id: 'asc' } } },
  })
  return NextResponse.json(items.map(serialize))
}

// Hermes contract: { text, tag?, body?, meta?: object, source?: "hermes" }
export async function POST(req) {
  const { text, tag = 'general', body, meta, source = 'manual' } = await req.json()
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }
  if (body != null && typeof body !== 'string') {
    return NextResponse.json({ error: 'body must be a string' }, { status: 400 })
  }
  if (meta != null && (typeof meta !== 'object' || Array.isArray(meta))) {
    return NextResponse.json({ error: 'meta must be an object' }, { status: 400 })
  }
  const item = await prisma.inboxItem.create({
    data: {
      text: text.trim(),
      tag:  String(tag),
      body: body?.trim() || null,
      meta: meta ? JSON.stringify(meta) : null,
      source: String(source),
    },
    include: { media: true },
  })
  return NextResponse.json(serialize(item))
}
