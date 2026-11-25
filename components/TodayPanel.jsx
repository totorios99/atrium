'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useToday, useBreaks } from '@/hooks/useStatus.js'

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
        <Breaks />
      </div>
    </div>
  )
}

// Twitter and Reddit stay blocked on my PC; each button opens one for 15 minutes.
function Breaks() {
  const { breaks, error, start } = useBreaks()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  if (!breaks) return null
  const left = until => { const s = Math.max(0, Math.round((until - now) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
  return (
    <section className="td-block">
      <div className="td-block-name">breaks</div>
      <div className="td-breaks">
        {breaks.map(b => (
          <button key={b.service} className={`ghost-btn${b.until && b.until > now ? ' on' : ''}`} disabled={!!b.until && b.until > now} onClick={() => start(b.service)}>
            {b.until && b.until > now ? `${b.label} open · ${left(b.until)}` : `${b.label} · 15 min`}
          </button>
        ))}
      </div>
      {error && <div className="td-status" style={{ color: 'hsl(var(--coral))' }}>{error}</div>}
    </section>
  )
}
