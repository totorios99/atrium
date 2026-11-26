import { NextResponse } from 'next/server'
import { authorized } from '@/lib/auth.js'
import { prisma } from '@/lib/db.js'
import { habits } from '@/habits.config.js'
import { dayOf } from '@/lib/habits.js'

// POST { habit, source, at?, ref?, note? } with Authorization: Bearer <EVENTS_TOKEN>.
// Callers: iPhone Shortcuts (NFC taps, Fitness-app workouts logged on the iPhone), the Forma poller, Hermes.
const KEYS = new Set(habits.flatMap(h => [h.key, ...(h.from ?? [])]))


export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const { habit, source, ref, note } = body ?? {}
  if (!KEYS.has(habit)) return NextResponse.json({ error: `unknown habit: ${habit}` }, { status: 400 })
  if (typeof source !== 'string' || !source || source.length > 40) return NextResponse.json({ error: 'source required (max 40)' }, { status: 400 })
  if (ref != null && !['string', 'number'].includes(typeof ref)) return NextResponse.json({ error: 'bad ref' }, { status: 400 })
  if (body.at != null && !['string', 'number'].includes(typeof body.at)) return NextResponse.json({ error: 'bad at' }, { status: 400 })
  // Forma history starts in 2023; nothing comes from more than a day ahead.
  const at = body.at != null ? new Date(body.at) : new Date()
  if (Number.isNaN(at.getTime()) || at < new Date('2023-01-01') || at.getTime() > Date.now() + 86400_000)
    return NextResponse.json({ error: 'bad at' }, { status: 400 })

  try {
    const row = await prisma.habitEvent.create({
      data: { habit, source, at, day: dayOf(at), ref: ref != null && ref !== '' ? String(ref).slice(0, 200) : null, note: note ? String(note).slice(0, 500) : null },
    })
    return NextResponse.json({ id: row.id, day: row.day }, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ duplicate: true })   // same source + ref already in
    throw e
  }
}
