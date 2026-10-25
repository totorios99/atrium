import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'

const STATUSES = ['pending', 'in-progress', 'done']

export async function PATCH(req, { params }) {
  const { id } = await params
  const body   = await req.json()

  const data = {}
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: 'bad status' }, { status: 400 })
    data.status      = body.status
    data.completedAt = body.status === 'done' ? new Date() : null
  }
  if (body.label !== undefined) {
    if (typeof body.label !== 'string' || !body.label.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })
    data.label = body.label.trim()
  }

  try {
    const item = await prisma.weeklyItem.update({ where: { id: Number(id) }, data })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
}
