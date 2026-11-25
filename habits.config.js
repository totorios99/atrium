// The one list of habits (Nov 24th, 2026). Habits no longer live in each vault's STATUS.md.
// period 'day': done or not each day; 'Never miss twice' is about days.
// period 'week': `target` per Monday-Sunday week; 'Never miss twice' is about weeks.
// unit 'days' counts distinct days with an event; otherwise every event counts.
// from: the event habits that feed this one (default: its own key).
// block: the part of the day it belongs to in the Today panel (see BLOCKS), no fixed hour.
// The design and the rule that only events an agent can't produce count live in
// self-brain → growth/Idea — Habit system.md.
export const habits = [
  { key: 'breakfast',   label: 'Breakfast ready', period: 'day', block: 'evening' },
  { key: 'night',       label: 'Night routine',   period: 'day', block: 'evening' },
  { key: 'cyber',       label: 'Cyber practice',  period: 'day', block: 'afternoon' },
  { key: 'apply',       label: 'Apply to jobs',   period: 'week', target: 5, block: 'morning' },
  { key: 'hypertrophy', label: 'Hypertrophy',     period: 'week', target: 4, unit: 'days', block: 'midday' },
  { key: 'movement',    label: 'Movement',        period: 'week', target: 5, unit: 'days', from: ['hypertrophy', 'movement'], block: 'midday' },
]

// Events are dated in my time zone, and a day ends at 04:00: a night routine tapped
// at 00:30 belongs to the day before.
// The Today panel's sections, in order. Meals go under 'all day'.
export const BLOCKS = ['all day', 'morning', 'midday', 'afternoon', 'evening']

export const TIME_ZONE = 'America/Mexico_City'
export const DAY_CUTOFF_HOURS = 4
export const WEEKS_SHOWN = 26
