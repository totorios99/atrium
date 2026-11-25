import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'
import { currentWeekKey } from '@/lib/vault.js'

// One list that carries over. Until Nov 25th, 2026 every new week re-seeded six default
// items, so things I had cleared came back on their own every Monday.
const CLEAR_AFTER_MS   = 24 * 60 * 60 * 1000        // done items leave the list one day after completion
const ARCHIVE_KEEP_MS  = 30 * 24 * 60 * 60 * 1000   // and leave the archive a month after that

export async function GET() {
  await prisma.weeklyItem.deleteMany({ where: { status: 'done', completedAt: { lt: new Date(Date.now() - ARCHIVE_KEEP_MS) } } })
  const all    = await prisma.weeklyItem.findMany({ orderBy: [{ pos: 'asc' }, { id: 'asc' }] })
  const cutoff = Date.now() - CLEAR_AFTER_MS
  const items  = all.filter(i => !(i.status === 'done' && i.completedAt && i.completedAt.getTime() < cutoff))
  const archive = all
    .filter(i => i.status === 'done' && i.completedAt)
    .sort((a, b) => b.completedAt - a.completedAt)
    .map(({ id, label, weekKey, completedAt }) => ({ id, label, weekKey, completedAt }))

  return NextResponse.json({ items, archive, done: items.filter(i => i.status === 'done').length, total: items.length })
}

export async function POST(req) {
  const { label } = await req.json().catch(() => ({}))
  if (typeof label !== 'string' || !label.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })
  const last = await prisma.weeklyItem.aggregate({ _max: { pos: true } })
  const item = await prisma.weeklyItem.create({ data: { weekKey: currentWeekKey(), label: label.trim().slice(0, 200), pos: (last._max.pos ?? 0) + 1 } })
  return NextResponse.json(item, { status: 201 })
}
