import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'
import { currentWeekKey, defaultWeeklyItems } from '@/lib/vault.js'

const CLEAR_AFTER_MS = 24 * 60 * 60 * 1000   // done items leave the list one day after completion
const ARCHIVE_LIMIT  = 100

async function getOrCreateWeek(weekKey) {
  const existing = await prisma.weeklyItem.findMany({ where: { weekKey }, orderBy: { pos: 'asc' } })
  if (existing.length > 0) return existing

  const defaults = defaultWeeklyItems()
  await prisma.weeklyItem.createMany({
    data: defaults.map((item, i) => ({ weekKey, label: item.label, status: item.status, pos: i })),
  })
  return prisma.weeklyItem.findMany({ where: { weekKey }, orderBy: { pos: 'asc' } })
}

export async function GET() {
  const weekKey = currentWeekKey()
  const all     = await getOrCreateWeek(weekKey)
  const cutoff  = Date.now() - CLEAR_AFTER_MS
  const items   = all.filter(i => !(i.status === 'done' && i.completedAt && i.completedAt.getTime() < cutoff))

  const archive = await prisma.weeklyItem.findMany({
    where:   { status: 'done', completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take:    ARCHIVE_LIMIT,
    select:  { id: true, label: true, weekKey: true, completedAt: true },
  })

  return NextResponse.json({ weekKey, items, archive, weekDone: all.filter(i => i.status === 'done').length, weekTotal: all.length })
}
