'use client'

import { useHabits } from '@/hooks/useStatus.js'

// One row per habit: status line plus 26 weekly cells, filled by how much of the week's
// target was met. Events come in on their own (habits.config.js, /api/events); nothing to tick.
export default function HabitsPanel() {
  const { habits } = useHabits()

  return (
    <div className="glass card habits-card">
      <div className="card-head">
        <div className="card-label head-jade"><span className="dot" />Habits</div>
      </div>
      {!habits ? null : habits.map(h => (
        <div key={h.key} className={`hm-row${h.done ? ' done' : ''}${h.warn ? ' warn' : ''}`}>
          <div className="hm-text">
            <div className="h-name">{h.label}</div>
            <div className="hm-status">{h.text}</div>
          </div>
          <div className="hm-cells" aria-label={`${h.label}: last ${h.cells.length} weeks`}>
            {h.cells.map((c, i) => (
              <span
                key={c.week}
                className={`hm-cell${i === h.cells.length - 1 ? ' now' : ''}`}
                style={{ '--r': c.ratio }}
                title={`Week of ${c.week}: ${c.count}${h.period === 'day' ? '/7 days' : `/${h.target}`}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
