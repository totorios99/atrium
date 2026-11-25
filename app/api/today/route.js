import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db.js'
import { habits, BLOCKS } from '@/habits.config.js'
import { dayOf, addDays, mondayOf, summarize } from '@/lib/habits.js'
import { pending } from '@/lib/recruiter.js'

export const dynamic = 'force-dynamic'

const STRIP_WEEKS = 8   // weekly quotas show their last 8 weeks; daily habits their last 7 days

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
    where: { day: { gte: addDays(mondayOf(today), -7 * STRIP_WEEKS) } }, select: { habit: true, day: true },
  })
  const byKey = new Map(summarize(habits, events, today, STRIP_WEEKS).map(s => [s.key, s]))

  const items = habits.map(h => {
    const s = byKey.get(h.key)
    const strip = h.period === 'day'
      ? s.days.map(d => ({ id: d.day, r: d.done ? 1 : 0, title: d.day }))
      : s.cells.map(c => ({ id: c.week, r: c.ratio, title: `Week of ${c.week}: ${c.count}/${h.target}` }))
    return { key: h.key, block: h.block ?? 'all day', label: h.label, text: s.text, done: s.done, warn: s.warn, strip }
  })
  const m = await meals(today)
  items.push({ key: 'meals', block: 'all day', label: 'Meals', text: m.detail, list: m.titles, done: false, warn: false })

  // recruiter mails open the morning, before applying to new jobs
  for (const r of (await pending()).reverse())
    items.unshift({ key: `mail:${r.id}`, mailId: r.id, block: 'morning', label: r.subject, text: `${r.from} · ${r.date}`, warn: true, done: false })

  const blocks = BLOCKS.map(name => ({ name, items: items.filter(i => i.block === name) })).filter(b => b.items.length)
  return NextResponse.json({ today, blocks })
}
