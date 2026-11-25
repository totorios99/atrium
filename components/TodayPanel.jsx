'use client'

import Link from 'next/link'
import { useToday } from '@/hooks/useStatus.js'

// What today asks of me, by part of the day, and how each habit is going. Nothing to tick:
// a row turns done when its event arrives (habits.config.js). The strip is the last 7 days
// for a daily habit and the last 8 weeks for a weekly quota; the full history is /habits.
export default function TodayPanel() {
  const { today } = useToday()

  return (
    <div className="glass card today-card">
      <div className="card-head">
        <div className="card-label head-jade"><span className="dot" />Today</div>
        <Link className="ghost-btn" href="/habits">history</Link>
      </div>
      <div className="card-scroll">
        {!today ? null : today.blocks.map(b => (
          <section key={b.name} className="td-block">
            <div className="td-block-name">{b.name}</div>
            {b.items.map(i => (
              <div key={i.key} className={`td-row${i.done ? ' done' : ''}${i.warn ? ' warn' : ''}`}>
                <div className="td-text">
                  <div className="td-name">{i.label}</div>
                  <div className="td-status">{i.list?.length ? i.list.join(' · ') : i.text}</div>
                </div>
                {i.strip && (
                  <div className="td-strip" aria-label={`${i.label}: recent history`}>
                    {i.strip.map((c, n) => (
                      <span key={c.id} className={`hm-cell${n === i.strip.length - 1 ? ' now' : ''}`} style={{ '--r': c.r }} title={c.title} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
