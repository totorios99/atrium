// The one list of habits (Nov 24th, 2026). Habits no longer live in each vault's STATUS.md.
// period 'day': done or not each day; 'Never miss twice' is about days.
// period 'week': `target` per Monday-Sunday week; 'Never miss twice' is about weeks.
// unit 'days' counts distinct days with an event; otherwise every event counts.
// from: the event habits that feed this one (default: its own key).
// The design and the rule that only events an agent can't produce count live in
// self-brain → growth/Idea — Habit system.md.
export const habits = [
  { key: 'breakfast',   label: 'Breakfast ready', period: 'day' },
  { key: 'night',       label: 'Night routine',   period: 'day' },
  { key: 'cyber',       label: 'Cyber practice',  period: 'day' },
  { key: 'apply',       label: 'Apply to jobs',   period: 'week', target: 5 },
  { key: 'hypertrophy', label: 'Hypertrophy',     period: 'week', target: 4, unit: 'days' },
  { key: 'movement',    label: 'Movement',        period: 'week', target: 5, unit: 'days', from: ['hypertrophy', 'movement'] },
]

// Events are dated in my time zone, and a day ends at 04:00: a night routine tapped
// at 00:30 belongs to the day before.
export const TIME_ZONE = 'America/Mexico_City'
export const DAY_CUTOFF_HOURS = 4
export const WEEKS_SHOWN = 26
