'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/utils/api.js'
import { setNested } from '@/utils/shared.js'

const POLL_INTERVAL  = 30_000
const WEEKLY_CYCLE   = ['pending', 'in-progress', 'done']

export function useStatus() {
  const [statuses, setStatuses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const data = await api.getAllStatus()
      setStatuses(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    const id = setInterval(fetchAll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAll])

  const updateField = useCallback(async (vaultId, key, value) => {
    const prev = statuses
    setStatuses(curr => curr.map(s => s.vault_id === vaultId ? setNested(s, key, value) : s))
    try {
      await api.updateStatus(vaultId, { [key]: value })
    } catch (e) {
      setStatuses(prev)
      setError(`Failed to save: ${e.message}`)
    }
  }, [statuses])

  const updateFields = useCallback(async (vaultId, updates) => {
    const prev = statuses
    setStatuses(curr => curr.map(s => {
      if (s.vault_id !== vaultId) return s
      let next = s
      for (const [key, val] of Object.entries(updates)) next = setNested(next, key, val)
      return next
    }))
    try {
      await api.updateStatus(vaultId, updates)
    } catch (e) {
      setStatuses(prev)
      setError(`Failed to save: ${e.message}`)
    }
  }, [statuses])

  return { statuses, loading, error, refresh: fetchAll, updateField, updateFields }
}

export function useInbox() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getInbox()
      setItems(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  // Hermes posts in the background — poll like useStatus
  useEffect(() => {
    const id = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [load])

  const add = useCallback(async (text, tag) => {
    const optimistic = { id: `tmp-${Date.now()}`, text, tag, media: [], createdAt: new Date().toISOString() }
    setItems(prev => [optimistic, ...prev])
    try {
      const real = await api.addInboxItem(text, tag)
      setItems(prev => prev.map(i => i.id === optimistic.id ? real : i))
      return { ok: true }
    } catch (e) {
      setItems(prev => prev.filter(i => i.id !== optimistic.id))
      return { ok: false, error: e.message }
    }
  }, [])

  const remove = useCallback(async (id) => {
    const prev = items
    setItems(curr => curr.filter(i => i.id !== id))
    try {
      await api.deleteInboxItem(id)
    } catch {
      setItems(prev)
    }
  }, [items])

  // patch = { text } | { body }
  const update = useCallback(async (id, patch) => {
    const prev = items
    setItems(curr => curr.map(i => i.id === id ? { ...i, ...patch } : i))
    try {
      await api.updateInboxItem(id, patch)
    } catch {
      setItems(prev)
    }
  }, [items])

  const addMedia = useCallback(async (id, files) => {
    try {
      const created = await api.uploadInboxMedia(id, files)
      setItems(curr => curr.map(i => i.id === id ? { ...i, media: [...(i.media ?? []), ...created] } : i))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }, [])

  const removeMedia = useCallback(async (id, url) => {
    const prev = items
    setItems(curr => curr.map(i => i.id === id ? { ...i, media: i.media.filter(m => m.url !== url) } : i))
    try { await api.deleteInboxMedia(url) } catch { setItems(prev) }
  }, [items])

  return { items, loading, error, add, remove, update, addMedia, removeMedia }
}

export function useWeekly() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const d = await api.getWeekly()
      setData(d)
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  // done items expire from the list 24 h after completion — poll so it clears on its own
  useEffect(() => {
    const id = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [load])

  const patchItem = (id, patch) => setData(prev => ({
    ...prev,
    items: prev.items.map(item => item.id === id ? { ...item, ...patch } : item),
  }))

  const cycleItem = useCallback(async (id) => {
    const item = data?.items?.find(i => i.id === id)
    if (!item) return
    const next = WEEKLY_CYCLE[(WEEKLY_CYCLE.indexOf(item.status) + 1) % WEEKLY_CYCLE.length]
    patchItem(id, { status: next })
    try { await api.updateWeeklyItem(id, next) } catch { /* fall through to reload */ }
    load()   // refresh counts + archive
  }, [data, load])

  const updateLabel = useCallback(async (id, label) => {
    if (!label.trim()) return
    patchItem(id, { label })
    try { await api.updateWeeklyLabel(id, label) } catch { load() }
  }, [load])

  return { data, loading, cycleItem, updateLabel }
}

// next_move values that mean "nothing to do yet" — hidden from Active Priorities
const PLACEHOLDERS = ['no next_move set', 'write the first note in this vault']
const SCOPE_RANK   = { today: 0, 'this-week': 1, someday: 2 }

const actionable = s =>
  s._found && s.next_move?.trim() && !PLACEHOLDERS.includes(s.next_move.trim().toLowerCase())

// blocked → scope (today first) → oldest last_updated first
function autoCompare(a, b) {
  return (!!b.blocked - !!a.blocked)
    || ((SCOPE_RANK[a.next_move_scope] ?? 1) - (SCOPE_RANK[b.next_move_scope] ?? 1))
    || String(a.last_updated || '').localeCompare(String(b.last_updated || ''))
}

// pinned rows (user-dragged) on top in pin order, rest auto-sorted
export function usePriorityOrder(statuses) {
  const [pins, setPins] = useState([])

  useEffect(() => {
    api.getPriorityOrder().then(({ order = [] }) => setPins(order)).catch(() => {})
  }, [])

  const savePins = useCallback(async (next) => {
    setPins(next)
    try { await api.savePriorityOrder(next) } catch { /* reverts on next load */ }
  }, [])

  const rows   = statuses.filter(actionable)
  const pinned = pins.map(id => rows.find(s => s.vault_id === id)).filter(Boolean)
  const rest   = rows.filter(s => !pins.includes(s.vault_id)).sort(autoCompare)

  return { sorted: [...pinned, ...rest], pins, savePins }
}
