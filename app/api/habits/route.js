import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'
import { habits, WEEKS_SHOWN } from '@/habits.config.js'
import { dayOf, addDays, mondayOf, summarize } from '@/lib/habits.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const today = dayOf(new Date())
  const since = addDays(mondayOf(today), -7 * WEEKS_SHOWN)
  const events = await prisma.habitEvent.findMany({ where: { day: { gte: since } }, select: { habit: true, day: true } })
  return NextResponse.json({ today, habits: summarize(habits, events, today) })
}
