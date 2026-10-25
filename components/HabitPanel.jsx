'use client'

import { useCallback, useState, useEffect } from 'react'
import { api } from '@/utils/api.js'
import Pager from './Pager.jsx'

// keys must match vault ids in vault.config.js
const VAULT_CLASS = {
  cyber:        'h-cyber',
  fitness:      'h-fit',
  spirituality: 'h-spirit',
  homelab:      'h-home',
}

const HABITS_PER_PAGE = 4

function habitClass(vaultId) {
  return VAULT_CLASS[vaultId?.toLowerCase()] ?? 'h-home'
}

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function HabitPanel({ statuses, onUpdate }) {
  const [histories, setHistories] = useState({})
  const [page,      setPage]      = useState(0)

  const vaultIds = statuses.map(s => s.vault_id).join()
  useEffect(() => {
    statuses.forEach(s => {
      api.getHabitHistory(s.vault_id)
        .then(h => setHistories(prev => ({ ...prev, [s.vault_id]: h })))
        .catch(() => {})
    })
  }, [vaultIds])

  const habits = statuses.flatMap(s => {
    if (!s.habits || typeof s.habits !== 'object') return []
    return Object.entries(s.habits).map(([key, done]) => ({
      vaultId: s.vault_id, vaultLabel: s.vault_label || s.vault_id,
      key, label: formatLabel(key), done: done === true,
      history: histories[s.vault_id]?.[key] ?? Array(7).fill(false),
    }))
  })

  const totalPages = Math.max(1, Math.ceil(habits.length / HABITS_PER_PAGE))
  const safePage   = Math.min(page, totalPages - 1)
  const pageHabits = habits.slice(safePage * HABITS_PER_PAGE, (safePage + 1) * HABITS_PER_PAGE)

  const toggle = useCallback((vaultId, key, current) => {
    onUpdate(vaultId, `habits.${key}`, !current)
    setHistories(prev => {
      const vh  = { ...prev[vaultId] }
      const arr = [...(vh[key] ?? Array(7).fill(false))]
      arr[6]    = !current
      vh[key]   = arr
      return { ...prev, [vaultId]: vh }
    })
  }, [onUpdate])

  if (!habits.length) {
    return (
      <div className="glass card habits-card">
        <div className="card-head">
          <div className="card-label head-jade"><span className="dot" />Daily Habits</div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>
          No habits defined. Add a <code style={{ fontFamily: '"JetBrains Mono",monospace' }}>habits:</code> block to STATUS.md
        </p>
      </div>
    )
  }

  return (
    <div className="glass card habits-card">
      <div className="card-head">
        <div className="card-label head-jade"><span className="dot" />Daily Habits</div>
      </div>
      <div key={safePage} className="fade-up" style={{ flex: 1, minHeight: 0 }}>
        {pageHabits.map(h => (
          <HabitRow key={`${h.vaultId}-${h.key}`} habit={h} onToggle={toggle} />
        ))}
      </div>
      <Pager page={safePage} total={totalPages} onChange={setPage} />
    </div>
  )
}

function HabitRow({ habit, onToggle }) {
  const { vaultId, vaultLabel, label, done, history } = habit
  const [localDone, setLocalDone] = useState(done)

  useEffect(() => { setLocalDone(done) }, [done])

  const streak = (() => {
    let count = 0
    const arr = [...history]; arr[6] = localDone
    for (let i = arr.length - 1; i >= 0; i--) { if (arr[i]) count++; else break }
    return count
  })()

  const handleToggle = () => {
    setLocalDone(!localDone)
    onToggle(vaultId, habit.key, localDone)
  }

  const cls = habitClass(vaultId)

  return (
    <div className={`habit ${cls}`}>
      <div>
        <div className="h-name">{label}</div>
        <div className="h-meta">
          <span key={streak} className="fade-up">{streak} day streak</span>
          {vaultLabel && <> · <b>{vaultLabel}</b></>}
        </div>
      </div>
      <div className="streak">
        {history.map((filled, i) => {
          const isToday = i === 6
          const active  = isToday ? localDone : filled
          return isToday ? (
            <button
              key={i}
              className={`pip${active ? ' on' : ''}`}
              aria-label={`${label} today`}
              onClick={handleToggle}
            />
          ) : (
            <span key={i} className={`pip${active ? ' on' : ''}`} aria-hidden="true" />
          )
        })}
      </div>
      <button className="add-btn" aria-label={`Mark ${label} done today`} onClick={handleToggle}>
        +
      </button>
    </div>
  )
}
