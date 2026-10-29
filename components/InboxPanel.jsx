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
  { id: 'photography',  label: 'photo',   cls: 'tag-photo'   },
  { id: 'style',        label: 'style',   cls: 'tag-style'   },
  { id: 'home',         label: 'home',    cls: 'tag-home'    },
  { id: 'branch',       label: 'branch',  cls: 'tag-branch'  },
]

const tagInfo = id => TAGS.find(t => t.id === id) ?? TAGS[0]

const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const hasDetail = i => !!(i.body || i.meta || i.media?.length)

const EXIT_MS = 220   // matches .inbox-modal close transition

// full-screen photo viewer — its own modal <dialog> so it sits in the top layer
// (a fixed child of the glass modal would be clipped by its backdrop-filter)
function PhotoViewer({ media, index, onIndex, onClose }) {
  const ref  = useRef(null)
  const step = d => onIndex((index + d + media.length) % media.length)
  useEffect(() => { ref.current?.showModal() }, [])
  return (
    <dialog
      ref={ref}
      className="im-viewer"
      onClose={onClose}
      onClick={() => ref.current.close()}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft')  step(-1)
        if (e.key === 'ArrowRight') step(1)
      }}
    >
      <img key={media[index].url} src={media[index].url} alt="" onClick={e => e.stopPropagation()} />
      {media.length > 1 && (
        <>
          <button className="im-nav prev" onClick={e => { e.stopPropagation(); step(-1) }} aria-label="Previous photo">‹</button>
          <button className="im-nav next" onClick={e => { e.stopPropagation(); step(1) }} aria-label="Next photo">›</button>
        </>
      )}
      <span className="im-count">{index + 1} / {media.length}</span>
    </dialog>
  )
}

// mail-style detail view. Opens read-only; "Edit" unlocks subject, notes, photos, delete.
function InboxModal({ item, onClose, update, remove, addMedia, removeMedia }) {
  const ref = useRef(null)
  const [editing,   setEditing]   = useState(false)
  const [subject,   setSubject]   = useState(item.text ?? '')
  const [notes,     setNotes]     = useState(item.body ?? '')
  const [viewer,    setViewer]    = useState(null)   // index of photo shown full-size
  const [uploading, setUploading] = useState(false)
  const [upError,   setUpError]   = useState(null)

  useEffect(() => {
    ref.current?.showModal()
    ref.current?.focus()   // focus the sheet, not the first button (no stray focus ring)
  }, [])

  const t      = tagInfo(item.tag)
  const meta   = item.meta ?? {}
  const dates  = Array.isArray(meta.dates) ? meta.dates : []
  const links  = (Array.isArray(meta.links) ? meta.links : [])
    .map(l => (typeof l === 'string' ? { url: l } : l))
    .filter(l => /^https?:\/\//.test(l?.url ?? ''))          // http(s) only
  const media  = item.media ?? []
  const saved  = typeof item.id === 'number'                 // optimistic tmp items can't be edited yet

  const saveEdits = () => {
    const v = subject.trim()
    if (v && v !== item.text) update(item.id, { text: v })
    else setSubject(item.text ?? '')
    if (notes !== (item.body ?? '')) update(item.id, { body: notes })
  }
  const close      = () => ref.current?.close()
  const toggleEdit = () => { if (editing) saveEdits(); setEditing(e => !e) }

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
      onClose={e => {
        if (e.target !== ref.current) return   // React bubbles the nested PhotoViewer's close up here
        if (editing) saveEdits()
        setTimeout(onClose, EXIT_MS)
      }}
      tabIndex={-1}
      onClick={e => { if (e.target === ref.current) close() }}
    >
      <div className="im-head">
        <span className={`tag ${t.cls}`}>{t.label}</span>
        {editing ? (
          <input
            className="im-subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') toggleEdit() }}
            aria-label="Subject"
            autoFocus
          />
        ) : (
          <h2 className="im-subject">{item.text}</h2>
        )}
        {saved && (
          <button className={`ghost-btn${editing ? ' active' : ''}`} onClick={toggleEdit}>
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
        <button className="x-btn" onClick={close} aria-label="Close">×</button>
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

      {editing ? (
        <>
          <div className="field-label">Notes</div>
          <textarea
            className="im-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes…"
            rows={5}
          />
        </>
      ) : item.body ? (
        <p className="im-body">{item.body}</p>
      ) : null}

      {links.length > 0 && (
        <ul className="im-links">
          {links.map((l, i) => (
            <li key={i}><a href={l.url} target="_blank" rel="noreferrer">{l.label || l.url}</a></li>
          ))}
        </ul>
      )}

      {(media.length > 0 || editing) && (
        <>
          <div className="im-photos-head">
            <div className="field-label">Photos{media.length ? ` · ${media.length}` : ''}</div>
            {editing && (
              <label className="ghost-btn">
                {uploading ? 'uploading…' : '+ photo'}
                <input type="file" accept="image/*" multiple hidden onChange={onFiles} disabled={uploading} />
              </label>
            )}
          </div>
          {upError && <p className="im-error">⚠ {upError}</p>}
          <div className="im-photos">
            {media.map((m, i) => (
              <div key={m.url} className="im-photo">
                <button className="im-thumb" onClick={() => setViewer(i)} aria-label={`View photo ${i + 1}`}>
                  <img src={m.url} alt="" />
                </button>
                {editing && (
                  <button className="x-btn" onClick={() => removeMedia(item.id, m.url)} aria-label="Remove photo">×</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <div className="im-foot">
          <button className="ghost-btn danger" onClick={() => { remove(item.id); close() }}>Delete item</button>
        </div>
      )}

      {viewer !== null && media[viewer] && (
        <PhotoViewer media={media} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
      )}
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
            <div
              key={item.id ?? i}
              className="inbox-item"
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(item.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(item.id) } }}
            >
              <span className={`tag ${t.cls}`}>{t.label}</span>
              <span className="i-text">{item.text ?? '(no content)'}</span>
              {hasDetail(item) && (
                <span className="i-badge" title={item.source !== 'manual' ? `from ${item.source}` : 'has details'}>
                  {item.media?.length ? `▣ ${item.media.length}` : '≡'}
                </span>
              )}
              <button className="x-btn" onClick={e => { e.stopPropagation(); remove(item.id) }} aria-label="Dismiss">×</button>
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
