'use client'

import { useState } from 'react'
import { useWeekly } from '@/hooks/useStatus.js'

const STATE_CLS = ['', 'prog', 'done']
const STATE_TXT = ['pending', 'in progress', 'done']

/* map stored status string → 0/1/2 index */
function stateIndex(status) {
  if (status === 'in-progress') return 1
  if (status === 'done')        return 2
  return 0
}

const fmtDay = iso => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export default function WeeklyPanel() {
  const { data, loading, cycleItem, updateLabel } = useWeekly()
  const [editingId,   setEditingId]   = useState(null)
  const [editLabel,   setEditLabel]   = useState('')
  const [showArchive, setShowArchive] = useState(false)

  if (loading || !data) {
    return (
      <div className="glass card">
        <div className="card-head">
          <div className="card-label head-jade"><span className="dot" />Weekly Checklist</div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</p>
      </div>
    )
  }

  const archive = data.archive ?? []
  const commit  = id => { updateLabel(id, editLabel); setEditingId(null) }

  return (
    <div className="glass card">
      <div className="card-head">
        <div className="card-label head-jade"><span className="dot" />{showArchive ? 'Completed' : 'Weekly Checklist'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="ghost-btn"
            onClick={() => setShowArchive(v => !v)}
            aria-pressed={showArchive}
          >
            {showArchive ? '← this week' : `archive${archive.length ? ` · ${archive.length}` : ''}`}
          </button>
          {!showArchive && <span className="count-badge count-badge-jade">{data.weekDone}/{data.weekTotal}</span>}
        </div>
      </div>

      {showArchive ? (
        <div key="archive" className="card-scroll fade-up">
          {archive.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Nothing completed yet.</p>
          )}
          {archive.map(a => (
            <div key={a.id} className="archive-item">
              <span className="checkbox on" aria-hidden="true">
                <svg viewBox="0 0 14 14" fill="none"><path d="M2 7.5L5.5 11L12 3.5" /></svg>
              </span>
              <span className="c-text">{a.label}</span>
              <span className="archive-date">{fmtDay(a.completedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div key="week" className="card-scroll fade-up">
          {data.items.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>All done this week — see archive.</p>
          )}
          {data.items.map(item => {
            const si  = stateIndex(item.status)
            const cls = STATE_CLS[si]
            return (
              <div key={item.id} className={`check-item${cls ? ' ' + cls : ''}`} onClick={() => cycleItem(item.id)}>
                <span className="checkbox">
                  <svg viewBox="0 0 14 14" fill="none">
                    <path d="M2 7.5L5.5 11L12 3.5" />
                  </svg>
                </span>
                {editingId === item.id ? (
                  <input
                    className="inline-edit c-text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onBlur={() => commit(item.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  commit(item.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="c-text editable"
                    onClick={e => { e.stopPropagation(); setEditLabel(item.label); setEditingId(item.id) }}
                  >{item.label}</span>
                )}
                <span className="status-badge">{STATE_TXT[si]}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
