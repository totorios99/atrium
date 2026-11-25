import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'
import { habits } from '@/habits.config.js'
import { dayOf, addDays, mondayOf, summarize } from '@/lib/habits.js'

export const dynamic = 'force-dynamic'

// Mise answers on the host port; the admin secret makes it act as my user (header only).
async function mise(path) {
  const url = process.env.MISE_URL, secret = process.env.MISE_ADMIN_SECRET
  if (!url || !secret) throw new Error('not configured')
  const res = await fetch(url + path, { headers: { 'x-mise-admin-secret': secret }, signal: AbortSignal.timeout(3000), cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Today's plate from Mise; the base day when today was never planned.
// ponytail: /plans/week creates empty PlanDay rows for the 7 dates, same as opening the planner does.
async function meals(today) {
  try {
    const week = await mise(`/api/plans/week?start=${today}`)
    const day = week.days?.find(d => d.date.slice(0, 10) === today)
    if (day?.isDismissed) return { titles: [], detail: 'day off in Mise' }
    let titles = (day?.meals ?? []).map(m => m.meal?.title).filter(Boolean)
    let detail = 'planned'
    if (!titles.length) {
      titles = ((await mise('/api/plans/base')).meals ?? []).map(m => m.meal?.title).filter(Boolean)
      detail = 'base day'
    }
    return titles.length ? { titles, detail } : { titles: [], detail: 'nothing planned in Mise' }
  } catch (e) {
    return { titles: [], detail: `Mise unreachable (${e.message})` }
  }
}

export async function GET() {
  const today = dayOf(new Date())
  const events = await prisma.habitEvent.findMany({
    where: { day: { gte: addDays(mondayOf(today), -7) } }, select: { habit: true, day: true },
  })
  const byKey = new Map(summarize(habits, events, today, 2).map(s => [s.key, s]))

  const items = habits.map(h => {
    const s = byKey.get(h.key)
    return { key: h.key, at: h.at ?? null, label: h.label, text: s.text, done: s.done, warn: s.warn }
  })
  const m = await meals(today)
  items.push({ key: 'meals', at: null, label: 'Meals', text: m.detail, list: m.titles, done: false, warn: false })

  // Timed items first by hour, then the untimed ones (weekly quotas, meals) in config order.
  items.sort((a, b) => (a.at === null) - (b.at === null) || (a.at ?? '').localeCompare(b.at ?? ''))
  return NextResponse.json({ today, items })
}
