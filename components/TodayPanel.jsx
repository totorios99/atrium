'use client'

import { useToday } from '@/hooks/useStatus.js'

// What today asks of me, in one list by hour. Nothing to tick: a row turns done when its
// event arrives (habits.config.js). Untimed rows are this week's quotas and Mise's meals.
export default function TodayPanel() {
  const { today } = useToday()

  return (
    <div className="glass card today-card">
      <div className="card-head">
        <div className="card-label head-jade"><span className="dot" />Today</div>
      </div>
      {!today ? null : today.items.map(i => (
        <div key={i.key} className={`td-row hm-row${i.done ? ' done' : ''}${i.warn ? ' warn' : ''}`}>
          <div className="td-at">{i.at ?? '—'}</div>
          <div className="hm-text">
            <div className="h-name">{i.label}</div>
            <div className="hm-status">{i.list?.length ? `${i.list.join(' · ')} (${i.text})` : i.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
