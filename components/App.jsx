'use client'

import { useState, useEffect, useMemo } from 'react'
import { useStatus, usePriorityOrder } from '@/hooks/useStatus.js'
import { getWeekNumber } from '@/utils/shared.js'

import FlipClock     from './FlipClock.jsx'
import QuoteWidget   from './QuoteWidget.jsx'
import PriorityPanel from './PriorityPanel.jsx'
import ProjectPanel  from './ProjectPanel.jsx'
import HabitPanel    from './HabitPanel.jsx'
import InboxPanel    from './InboxPanel.jsx'
import WeeklyPanel   from './WeeklyPanel.jsx'

function getDayOfYear(date) {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate()
  return Math.floor((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 86400000)
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

function greetingFor(h) {
  if (h < 5)  return 'GOOD NIGHT, ANTONIO'
  if (h < 12) return 'GOOD MORNING, ANTONIO'
  if (h < 18) return 'GOOD AFTERNOON, ANTONIO'
  return 'GOOD EVENING, ANTONIO'
}

function Header({ error }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { weekday, dateStr, week, day, leapDays } = useMemo(() => {
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return {
      weekday:  days[time.getDay()],
      dateStr:  `${months[time.getMonth()]} ${time.getDate()}, ${time.getFullYear()}`,
      week:     getWeekNumber(time),
      day:      getDayOfYear(time),
      leapDays: isLeapYear(time.getFullYear()) ? 366 : 365,
    }
  }, [time.toDateString()])

  return (
    <header className="glass header">
      <div className="header-left">
        <div className="greeting">{greetingFor(time.getHours())}</div>
        <div className="header-clock-row">
          <FlipClock time={time} />
          <div className="header-date">
            <div className="date-line">
              <span>{weekday}</span>
              <span className="sep">·</span>
              <span className="rest">{dateStr}</span>
            </div>
            <div className="clock-meta">Week {week} · Day {day} / {leapDays}</div>
          </div>
        </div>
        {error && (
          <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '10px', color: 'hsl(var(--coral))' }}>
            ⚠ Cannot reach server
          </div>
        )}
      </div>
      <div className="head-div" />
      <QuoteWidget bare />
    </header>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: '"JetBrains Mono",monospace', fontSize: '12px', color: 'var(--ink-faint)', letterSpacing: '.1em' }}>
      Connecting to vaults…
    </div>
  )
}

export default function App() {
  const { statuses, loading, error, updateField } = useStatus()
  const { sorted, pins, savePins }                = usePriorityOrder(statuses)

  if (loading) return <LoadingScreen />

  return (
    <>
      <div className="backdrop" />
      <main className="shell">
        <Header error={error} />
        <section className="main-row">
          <PriorityPanel statuses={sorted} onUpdate={updateField} pins={pins} onPinsChange={savePins} />
          <ProjectPanel  statuses={statuses} onUpdate={updateField} />
          <HabitPanel    statuses={statuses} onUpdate={updateField} />
        </section>
        <section className="bottom-row">
          <InboxPanel />
          <WeeklyPanel />
        </section>
      </main>
    </>
  )
}
