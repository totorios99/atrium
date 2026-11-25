'use client'

import { useToday } from '@/hooks/useStatus.js'

// What today asks of me, by part of the day. Nothing to tick: a row turns done when its
// event arrives (habits.config.js). Weekly quotas show how far the week is.
export default function TodayPanel() {
  const { today } = useToday()

  return (
    <div className="glass card today-card">
      <div className="card-head">
        <div className="card-label head-jade"><span className="dot" />Today</div>
      </div>
      {!today ? null : today.blocks.map(b => (
        <section key={b.name} className="td-block">
          <div className="td-block-name">{b.name}</div>
          {b.items.map(i => (
            <div key={i.key} className={`hm-row td-row${i.done ? ' done' : ''}${i.warn ? ' warn' : ''}`}>
              <div className="hm-text">
                <div className="h-name">{i.label}</div>
                <div className="hm-status">{i.list?.length ? `${i.list.join(' · ')} (${i.text})` : i.text}</div>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
