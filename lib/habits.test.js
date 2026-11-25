// Run: node lib/habits.test.js
import assert from 'node:assert/strict'
import { dayOf, addDays, mondayOf, summarize } from './habits.js'

// 04:00 cutoff in Mexico City (UTC-6): 00:30 local on the 25th is still the 24th; 05:00 is the 25th.
assert.equal(dayOf('2026-11-25T06:30:00Z'), '2026-11-24')
assert.equal(dayOf('2026-11-25T11:00:00Z'), '2026-11-25')
// 18:30 local is still the same day (the container clock is UTC, already the next day).
assert.equal(dayOf('2026-11-25T00:30:00Z'), '2026-11-24')
assert.equal(addDays('2026-12-31', 1), '2027-01-01')
assert.equal(mondayOf('2026-11-29'), '2026-11-23') // Sunday -> Monday before
assert.equal(mondayOf('2026-11-23'), '2026-11-23')

const H = [
  { key: 'night', label: 'Night', period: 'day' },
  { key: 'apply', label: 'Apply', period: 'week', target: 5 },
  { key: 'hypertrophy', label: 'Hyp', period: 'week', target: 4, unit: 'days' },
  { key: 'movement', label: 'Move', period: 'week', target: 5, unit: 'days', from: ['hypertrophy', 'movement'] },
]
const today = '2026-11-25' // Wednesday
const ev = (habit, ...days) => days.map(day => ({ habit, day }))
const s = Object.fromEntries(summarize(H, [
  ...ev('night', '2026-11-21', '2026-11-22'),                    // missed the 23rd and 24th
  ...ev('apply', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-24'),
  ...ev('hypertrophy', '2026-11-09', '2026-11-23', '2026-11-23', '2026-11-24'),  // two sessions on one day count once
  ...ev('movement', '2026-11-24', '2026-11-25'),
], today, 4).map(x => [x.key, x]))

assert.equal(s.night.text, 'Never miss twice')
assert.equal(s.night.streak, 0)
assert.equal(s.apply.count, 1)
assert.equal(s.apply.text, '1/5 this week')          // last week was met: no warning
assert.equal(s.apply.warn, false)
assert.equal(s.hypertrophy.count, 2)
assert.equal(s.hypertrophy.warn, true)                // last week had none
assert.equal(s.movement.count, 3)                     // 23rd, 24th, 25th: distinct days across both sources
assert.equal(s.apply.cells.length, 4)
assert.equal(s.apply.cells[2].count, 5)               // the week of Nov 16th
assert.equal(s.apply.cells[2].ratio, 1)

const daily = summarize(H.slice(0, 1), ev('night', '2026-11-23', '2026-11-24', '2026-11-25'), today, 1)[0]
assert.equal(daily.text, '3-day streak')
assert.equal(daily.done, true)
// Nothing logged before: day one, no warning (Nov 24th, 2026 launch).
const fresh = Object.fromEntries(summarize(H, ev('hypertrophy', today), today, 2).map(x => [x.key, x]))
assert.equal(fresh.night.text, 'Day one')
assert.equal(fresh.night.warn, false)
assert.equal(fresh.apply.text, '0/5 this week')
assert.equal(fresh.hypertrophy.warn, false)
console.log('habits.test OK')
