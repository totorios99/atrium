'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useInbox } from '@/hooks/useStatus.js'

const TAGS = [
  { id: 'general',      label: 'general', cls: 'tag-general' },
  { id: 'cyber',        label: 'cyber',   cls: 'tag-cyber'   },
  { id: 'fitness',      label: 'fit',     cls: 'tag-fit'     },
  { id: 'spirituality', label: 'spirit',  cls: 'tag-spirit'  },
  { id: 'homelab',      label: 'home',    cls: 'tag-home'    },
  { id: 'travel',       label: 'travel',  cls: 'tag-travel'  },
  { id: 'linux',        label: 'linux',   cls: 'tag-linux'   },
  { id: 'webdev',       label: 'web',     cls: 'tag-web'     },
  { id: 'coffee',       label: 'coffee',  cls: 'tag-coffee'  },
  { id: 'branch',       label: 'branch',  cls: 'tag-branch'  },
]

const tagInfo = id => TAGS.find(t => t.id === id) ?? TAGS[0]

const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const hasDetail = i => !!(i.body || i.meta || i.media?.length)

// mail-style detail view: subject, dates, notes, photos
function InboxModal({ item, onClose, update, remove, addMedia, removeMedia }) {
  const ref = useRef(null)
  const [subject,   setSubject]   = useState(item.text ?? '')
  const [notes,     setNotes]     = useState(item.body ?? '')
  const [uploading, setUploading] = useState(false)
  const [upError,   setUpError]   = useState(null)

  useEffect(() => { ref.current?.showModal() }, [])

  const t     = tagInfo(item.tag)
  const meta  = item.meta ?? {}
  const dates = Array.isArray(meta.dates) ? meta.dates : []
  const links = Array.isArray(meta.links) ? meta.links : []
  const saved = typeof item.id === 'number'   // optimistic tmp items can't take edits yet

  const saveSubject = () => {
    const v = subject.trim()
    if (v && v !== item.text) update(item.id, { text: v })
    else setSubject(item.text ?? '')
  }
  const saveNotes = () => { if (notes !== (item.body ?? '')) update(item.id, { body: notes }) }

  const onFiles = async e => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setUploading(true); setUpError(null)
    const r = await addMedia(item.id, files)
    setUploading(false)
    if (!r.ok) setUpError(r.error)
  }

  return (
    <dialog
      ref={ref}
      className="inbox-modal glass"
      onClose={onClose}
      onClick={e => { if (e.target === ref.current) ref.current.close() }}
    >
      <div className="im-head">
        <span className={`tag ${t.cls}`}>{t.label}</span>
        <input
          className="im-subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          onBlur={saveSubject}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          disabled={!saved}
          aria-label="Subject"
        />
        <button className="x-btn" onClick={() => ref.current.close()} aria-label="Close">×</button>
      </div>

      <div className="im-meta">
        {fmtDate(item.createdAt)}
        {item.source && item.source !== 'manual' && <> · via {item.source}</>}
        {meta.location && <> · {meta.location}</>}
      </div>

      {dates.length > 0 && (
        <ul className="im-dates">
          {dates.map((d, i) => (
            <li key={i}><span className="field-label">{d.label || 'date'}</span>{d.date}</li>
          ))}
        </ul>
      )}

      <div className="field-label">Notes</div>
      <textarea
        className="im-notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Add notes…"
        disabled={!saved}
        rows={5}
      />

      {links.length > 0 && (
        <ul className="im-links">
          {links.map((l, i) => {
            const href = typeof l === 'string' ? l : l?.url
            if (!/^https?:\/\//.test(href ?? '')) return null   // http(s) only
            return <li key={i}><a href={href} target="_blank" rel="noreferrer">{l.label || href}</a></li>
          })}
        </ul>
      )}

      <div className="im-photos-head">
        <div className="field-label">Photos{item.media?.length ? ` · ${item.media.length}` : ''}</div>
        {saved && (
          <label className="ghost-btn">
            {uploading ? 'uploading…' : '+ photo'}
            <input type="file" accept="image/*" multiple hidden onChange={onFiles} disabled={uploading} />
          </label>
        )}
      </div>
      {upError && <p className="im-error">⚠ {upError}</p>}
      {item.media?.length > 0 && (
        <div className="im-photos">
          {item.media.map(m => (
            <div key={m.url} className="im-photo">
              <a href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt="" loading="lazy" /></a>
              <button className="x-btn" onClick={() => removeMedia(item.id, m.url)} aria-label="Remove photo">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="im-foot">
        <button className="ghost-btn danger" onClick={() => { remove(item.id); ref.current.close() }}>Delete item</button>
      </div>
    </dialog>
  )
}

export default function InboxPanel() {
  const { items, loading, error, add, remove, update, addMedia, removeMedia } = useInbox()
  const [openId,     setOpenId]    = useState(null)
  const openItem = items.find(i => i.id === openId)
  const [text,       setText]      = useState('')
  const [tag,        setTag]       = useState('general')
  const [adding,     setAdding]    = useState(false)
  const [saving,     setSaving]    = useState(false)
  const [saveError,  setSaveError] = useState(null)

  const inputRef = useCallback(node => { if (node) node.focus() }, [])

  const openCapture  = () => { setSaveError(null); setAdding(true) }
  const closeCapture = () => { setText(''); setTag('general'); setAdding(false); setSaveError(null) }

  const handleAdd = async () => {
    const t = text.trim()
    if (!t || saving) return
    setSaving(true); setSaveError(null)
    const result = await add(t, tag)
    setSaving(false)
    if (result.ok) { setText(''); /* keep form open for rapid capture */ }
    else setSaveError('Failed to save')
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter')  handleAdd()
    if (e.key === 'Escape') closeCapture()
  }

  return (
    <div className="glass card">
      <div className="card-head">
        <div className="card-label head-azure">
          <span className="dot" />
          Inbox
          {items.length > 0 && (
            <span className="count-badge count-badge-azure">{items.length}</span>
          )}
        </div>
        <button
          className="ghost-btn"
          onClick={adding ? closeCapture : openCapture}
          aria-expanded={String(adding)}
        >
          {adding ? '× cancel' : '+ capture'}
        </button>
      </div>

      <form
        className={`capture-form${adding ? ' open' : ''}`}
        onSubmit={e => { e.preventDefault(); handleAdd() }}
      >
        <select className="capture-tag" value={tag} onChange={e => setTag(e.target.value)} aria-label="Vault">
          {TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input
          ref={adding ? inputRef : null}
          className="capture-input"
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Capture a thought…"
          disabled={saving}
          autoComplete="off"
        />
        <button className="capture-add" type="submit" disabled={!text.trim() || saving}>
          {saving ? '…' : 'Add'}
        </button>
      </form>

      {saveError && (
        <p style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '10px', color: 'hsl(var(--coral))', marginBottom: '8px' }}>
          ⚠ {saveError}
        </p>
      )}

      {error && !adding && (
        <p style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '10px', color: 'hsl(var(--coral))' }}>
          ⚠ Could not load inbox
        </p>
      )}

      <div className="card-scroll">
        {!loading && items.length === 0 && !adding && (
          <p style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Inbox clear — nothing to triage.</p>
        )}
        {items.map((item, i) => {
          const t = tagInfo(item.tag)
          return (
            <div key={item.id ?? i} className="inbox-item">
              <span className={`tag ${t.cls}`}>{t.label}</span>
              <button className="i-text i-open" onClick={() => setOpenId(item.id)}>
                {item.text ?? '(no content)'}
              </button>
              {hasDetail(item) && (
                <span className="i-badge" title={item.source !== 'manual' ? `from ${item.source}` : 'has details'}>
                  {item.media?.length ? `▣ ${item.media.length}` : '≡'}
                </span>
              )}
              <button className="x-btn" onClick={() => remove(item.id)} aria-label="Dismiss">×</button>
            </div>
          )
        })}
      </div>

      {openItem && (
        <InboxModal
          key={openItem.id}
          item={openItem}
          onClose={() => setOpenId(null)}
          update={update}
          remove={remove}
          addMedia={addMedia}
          removeMedia={removeMedia}
        />
      )}
    </div>
  )
}
