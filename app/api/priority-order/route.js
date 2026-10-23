import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'

// pinned vault ids (manual order); unpinned vaults auto-sort client-side
const SETTING_KEY = 'priority_pins'

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  const order = row ? JSON.parse(row.value) : []
  return NextResponse.json({ order })
}

export async function PATCH(req) {
  const { order } = await req.json()
  if (!Array.isArray(order) || !order.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'order must be string[]' }, { status: 400 })
  }
  await prisma.setting.upsert({
    where:  { key: SETTING_KEY },
    update: { value: JSON.stringify(order) },
    create: { key: SETTING_KEY, value: JSON.stringify(order) },
  })
  return NextResponse.json({ ok: true })
}
