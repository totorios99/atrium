// Pure habit math: no I/O, so the checks in habits.test.js run with plain node.
import { TIME_ZONE, DAY_CUTOFF_HOURS, WEEKS_SHOWN } from '../habits.config.js'

// 'YYYY-MM-DD' of an instant, in my time zone, with the 04:00 cutoff.
export function dayOf(at) {
  const shifted = new Date(new Date(at).getTime() - DAY_CUTOFF_HOURS * 3600_000)
  return shifted.toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
}

export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function mondayOf(day) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay() // 0 = Sunday
  return addDays(day, -((dow + 6) % 7))
}

// habits: habits.config.js entries; events: [{ habit, day }]; today: 'YYYY-MM-DD'
export function summarize(habits, events, today, weeks = WEEKS_SHOWN) {
  return habits.map(h => {
    const from = new Set(h.from ?? [h.key])
    const perDay = new Map()
    for (const e of events) if (from.has(e.habit)) perDay.set(e.day, (perDay.get(e.day) ?? 0) + 1)
    const value = day => {
      const n = perDay.get(day) ?? 0
      return h.period === 'day' || h.unit === 'days' ? Math.min(n, 1) : n
    }

    const thisMonday = mondayOf(today)
    const cells = []
    for (let w = weeks - 1; w >= 0; w--) {
      const start = addDays(thisMonday, -7 * w)
      let sum = 0
      for (let i = 0; i < 7; i++) {
        const day = addDays(start, i)
        if (day > today) break
        sum += value(day)
      }
      const goal = h.period === 'day' ? 7 : h.target
      cells.push({ week: start, count: sum, ratio: Math.min(1, sum / goal) })
    }

    // Before the first event there is nothing to miss: no 'Never miss twice' on day one.
    const first = [...perDay.keys()].sort()[0]
    return { key: h.key, label: h.label, period: h.period, target: h.target ?? null, cells, ...status(h, value, today, thisMonday, first) }
  })
}

function status(h, value, today, thisMonday, first) {
  if (h.period === 'day') {
    const doneToday = value(today) > 0
    let streak = 0
    for (let d = doneToday ? today : addDays(today, -1); value(d) > 0; d = addDays(d, -1)) streak++
    const missedYesterday = value(addDays(today, -1)) === 0 && first !== undefined && first < today
    const text = doneToday ? `${streak}-day streak`
      : missedYesterday ? 'Never miss twice'
      : streak ? `${streak}-day streak` : 'Day one'
    return { done: doneToday, streak, warn: !doneToday && missedYesterday, text }
  }
  const weekSum = start => { let s = 0; for (let i = 0; i < 7; i++) { const d = addDays(start, i); if (d <= today) s += value(d) } return s }
  const now = weekSum(thisMonday)
  const met = start => weekSum(start) >= h.target
  let streak = 0
  for (let w = addDays(thisMonday, -7); met(w); w = addDays(w, -7)) streak++
  if (now >= h.target) streak++
  const lastMissed = !met(addDays(thisMonday, -7)) && first !== undefined && first < thisMonday
  const text = now >= h.target ? `${streak}-week streak`
    : lastMissed ? `Never miss twice · ${now}/${h.target}`
    : `${now}/${h.target} this week`
  return { done: now >= h.target, streak, warn: now < h.target && lastMissed, count: now, text }
}
