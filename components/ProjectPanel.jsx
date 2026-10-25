'use client'

import { useState, useCallback, useEffect } from 'react'
import Pager from './Pager.jsx'

const VAULT_VARS = {
  cybersecurity: { color: 'hsl(var(--coral))', bg: 'hsl(var(--coral)/.16)', border: 'hsl(var(--coral)/.3)', pct: 'hsl(var(--coral))' },
  fitness:       { color: 'hsl(var(--jade))',  bg: 'hsl(var(--jade)/.16)',  border: 'hsl(var(--jade)/.3)',  pct: 'hsl(var(--jade))' },
  spirituality:  { color: 'hsl(var(--amethyst))', bg: 'hsl(var(--amethyst)/.16)', border: 'hsl(var(--amethyst)/.3)', pct: 'hsl(var(--amethyst))' },
  homelab:       { color: 'hsl(var(--azure))', bg: 'hsl(var(--azure)/.16)', border: 'hsl(var(--azure)/.3)', pct: 'hsl(var(--azure))' },
}

function vaultVars(vaultId) {
  return VAULT_VARS[vaultId?.toLowerCase()] ?? VAULT_VARS.homelab
}

export default function ProjectPanel({ statuses, onUpdate }) {
  const [page, setPage] = useState(0)

  const projects = statuses
    .filter(s => s.project_status === 'active' && s.project_name)
    .map(s => {
      const milestones     = Array.isArray(s.project_milestones) ? s.project_milestones : []
      const doneMilestones = milestones.filter(m => m.done).length
      const pct = milestones.length
        ? Math.round((doneMilestones / milestones.length) * 100)
        : Math.min(100, Math.max(0, Number(s.project_pct) || 0))
      return {
        vaultId: s.vault_id, vaultLabel: s.vault_label || s.vault_id,
        name: s.project_name, nextMove: s.project_next_move || s.next_move || '',
        pct, milestones, started: s.project_started || '',
      }
    })

  useEffect(() => {
    setPage(p => Math.min(p, Math.max(0, projects.length - 1)))
  }, [projects.length])

  const project = projects[Math.min(page, Math.max(0, projects.length - 1))]

  const toggleMilestone = useCallback((vaultId, milestones, idx) => {
    onUpdate(vaultId, 'project_milestones', milestones.map((m, i) => i === idx ? { ...m, done: !m.done } : m))
  }, [onUpdate])

  if (!projects.length) {
    return (
      <div className="glass card">
        <div className="card-head">
          <div className="card-label head-coral"><span className="dot" />Active Project</div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>
          No active projects. Set <code style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '11px' }}>project_status: active</code> in a STATUS.md
        </p>
      </div>
    )
  }

  const v = vaultVars(project.vaultId)

  return (
    <div className="glass card">
      <div className="card-head">
        <div className="card-label head-coral"><span className="dot" />Active Project</div>
      </div>

      <div key={page} className="fade-up" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="project-title">{project.name}</div>

        <div className="project-meta">
          <span className="vault-badge" style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
            {project.vaultLabel}
          </span>
          {project.started && (
            <span className="since">
              since {new Date(project.started).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>

        {project.nextMove && (
          <>
            <div className="field-label">Next move</div>
            <div className="next-move">{project.nextMove}</div>
          </>
        )}

        <div className="sprint">
          <div className="sprint-head">
            <span className="field-label" style={{ margin: 0 }}>Sprint progress</span>
            <span className="sprint-pct" style={{ color: v.pct }}>{project.pct}%</span>
          </div>
          <div className="bar">
            <span className="bar-fill" style={{ width: `${project.pct}%` }} />
          </div>
        </div>

        <div className="field-label" style={{ marginBottom: 10 }}>
          Milestones{' '}
          <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-ghost)', fontSize: '10px' }}>· tap to complete</span>
        </div>

        {project.milestones.length > 0 ? (
          <div className="chips">
            {project.milestones.map((m, i) => (
              <span
                key={`${m.label}-${i}`}
                className={`chip${m.done ? ' done' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => toggleMilestone(project.vaultId, project.milestones, i)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMilestone(project.vaultId, project.milestones, i) } }}
              >
                {m.label}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--ink-faint)', fontFamily: '"JetBrains Mono",monospace' }}>
            Add <code>project_milestones:</code> to STATUS.md
          </p>
        )}
      </div>

      <Pager page={Math.min(page, projects.length - 1)} total={projects.length} onChange={setPage} accent={v.color} />
    </div>
  )
}
