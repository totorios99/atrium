import { prisma } from '@/lib/db.js'

// Twitter and Reddit are blocked for my PC in AdGuard (client `hugo-pc`, Nov 25th, 2026).
// A break unblocks one of them for 15 minutes. The expiry lives in the Setting table and
// sync() makes AdGuard match it, so a restart in the middle of a break still re-blocks.
export const SERVICES = { twitter: 'Twitter', reddit: 'Reddit' }
export const BREAK_MS = 15 * 60 * 1000
const CLIENT = 'hugo-pc'
const key = s => `break:${s}`

async function adguard(path, body) {
  const { ADGUARD_URL: url, ADGUARD_USER: user, ADGUARD_PASS: pass } = process.env
  if (!url || !user || !pass) throw new Error('AdGuard not configured')
  const res = await fetch(`${url}/control/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'), 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`AdGuard ${path}: HTTP ${res.status}`)
  return body ? null : res.json()
}

export async function state() {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(SERVICES).map(key) } } })
  const until = Object.fromEntries(rows.map(r => [r.key.slice(6), Number(r.value)]))
  return Object.keys(SERVICES).map(s => ({ service: s, label: SERVICES[s], until: until[s] > Date.now() ? until[s] : null }))
}

// Make the PC client's blocked services match the breaks in force. Idempotent.
export async function sync() {
  const open = new Set((await state()).filter(b => b.until).map(b => b.service))
  const { clients } = await adguard('clients')
  const client = (clients ?? []).find(c => c.name === CLIENT)
  if (!client) throw new Error(`AdGuard client ${CLIENT} missing`)
  const others = (client.blocked_services ?? []).filter(s => !(s in SERVICES))
  const want = [...others, ...Object.keys(SERVICES).filter(s => !open.has(s))]
  const have = client.blocked_services ?? []
  if (want.length === have.length && want.every(s => have.includes(s))) return
  await adguard('clients/update', { name: CLIENT, data: { ...client, blocked_services: want } })
}

export async function start(service) {
  if (!(service in SERVICES)) throw new Error('unknown service')
  const until = Date.now() + BREAK_MS
  await prisma.setting.upsert({ where: { key: key(service) }, update: { value: String(until) }, create: { key: key(service), value: String(until) } })
  await sync()
  return until
}
