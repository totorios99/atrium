// All server communication lives here.
// Components never call fetch() directly.
// Uses relative /api paths — works correctly from any device on the network.

const BASE = '/api'

async function request(method, path, body) {
  const isForm = body instanceof FormData   // browser sets the multipart boundary
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body:    isForm ? body : body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  getAllStatus:      ()                   => request('GET',    '/status'),
  updateStatus:     (vaultId, updates)   => request('PATCH',  `/status/${vaultId}`, updates),
  getHabitHistory:  (vaultId)            => request('GET',    `/habits/${vaultId}/history`),
  getInbox:         ()                   => request('GET',    '/inbox'),
  addInboxItem:     (text, tag)          => request('POST',   '/inbox', { text, tag }),
  updateInboxItem:  (id, patch)          => request('PATCH',  `/inbox/${id}`, patch),   // { text?, body? }
  uploadInboxMedia: (id, files)          => {
    const fd = new FormData()
    for (const f of files) fd.append('file', f)
    return request('POST', `/inbox/${id}/media`, fd)
  },
  deleteInboxMedia: (url)                => request('DELETE', url.replace(/^\/api/, '')),
  deleteInboxItem:  (id)                 => request('DELETE', `/inbox/${id}`),
  getWeekly:        ()                   => request('GET',    '/weekly'),
  updateWeeklyItem: (id, status)         => request('PATCH',  `/weekly/${id}`, { status }),
  updateWeeklyLabel:(id, label)          => request('PATCH',  `/weekly/${id}`, { label }),
  getPriorityOrder: ()                   => request('GET',    '/priority-order'),
  savePriorityOrder:(order)              => request('PATCH',  '/priority-order', { order }),
  getHypeManifest:  ()                   => request('GET',    '/hype/manifest.json'),
}
