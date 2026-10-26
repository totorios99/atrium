'use client'

import { useState, useCallback, useEffect } from 'react'
import Pager from './Pager.jsx'

const VAULT_VARS = {
  cyber:         { color: 'hsl(var(--coral))', bg: 'hsl(var(--coral)/.16)', border: 'hsl(var(--coral)/.3)', pct: 'hsl(var(--coral))' },
  fitness:       { color: 'hsl(var(--jade))',  bg: 'hsl(var(--jade)/.16)',  border: 'hsl(var(--jade)/.3)',  pct: 'hsl(var(--jade))' },
  spirituality:  { color: 'hsl(var(--amethyst))', bg: 'hsl(var(--amethyst)/.16)', border: 'hsl(var(--amethyst)/.3)', pct: 'hsl(var(--amethyst))' },
  homelab:       { color: 'hsl(var(--azure))', bg: 'hsl(var(--azure)/.16)', border: 'hsl(var(--azure)/.3)', pct: 'hsl(var(--azure))' },
}

// vaults without a theme entry derive from their vault.config.js hex
function vaultVars(vaultId, hex = '#378ADD') {
  return VAULT_VARS[vaultId?.toLowerCase()] ?? { color: hex, bg: `${hex}29`, border: `${hex}4d`, pct: hex }
}

export default function ProjectPanel({ statuses, onUpdate }) {
  const [page, setPage]   = useState(0)
  const [hover, setHover] = useState(null)   // milestone index under pointer/focus

  const projects = statuses
    .filter(s => s.project_status === 'active' && s.project_name)
    .map(s => {
      const milestones     = Array.isArray(s.project_milestones) ? s.project_milestones : []
      const doneMilestones = milestones.filter(m => m.done).length
      const pct = milestones.length
        ? Math.round((doneMilestones / milestones.length) * 100)
        : Math.min(100, Math.max(0, Number(s.project_pct) || 0))
      return {
        vaultId: s.vault_id, vaultColor: s.vault_color, vaultLabel: s.vault_label || s.vault_id,
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

  const v = vaultVars(project.vaultId, project.vaultColor)

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
          <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-ghost)', fontSize: '10px' }}>· hover for details · tap to complete</span>
        </div>

        {project.milestones.length > 0 ? (<>
          <div className="chips">
            {project.milestones.map((m, i) => (
              <span
                key={`${m.label}-${i}`}
                className={`chip${m.done ? ' done' : ''}`}
                role="button"
                tabIndex={0}
                aria-description={m.desc || undefined}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => toggleMilestone(project.vaultId, project.milestones, i)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMilestone(project.vaultId, project.milestones, i) } }}
              >
                {m.label}
              </span>
            ))}
          </div>
          {/* ponytail: one shared line instead of per-chip tooltips — card overflow:hidden + backdrop-filter clip popovers */}
          <div className={`ms-desc${hover != null ? ' on' : ''}`}>
            {hover != null && (project.milestones[hover]?.desc || project.milestones[hover]?.label)}
          </div>
        </>) : (
          <p style={{ fontSize: '12px', color: 'var(--ink-faint)', fontFamily: '"JetBrains Mono",monospace' }}>
            Add <code>project_milestones:</code> to STATUS.md
          </p>
        )}
      </div>

      <Pager page={Math.min(page, projects.length - 1)} total={projects.length} onChange={p => { setHover(null); setPage(p) }} accent={v.color} />
    </div>
  )
}
