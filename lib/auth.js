import { timingSafeEqual } from 'node:crypto'

// Bearer EVENTS_TOKEN: the iPhone Shortcuts and the host pollers (Forma, HTB, pwn.college,
// recruiter mail). No token configured means every request is refused.
export function authorized(req) {
  const want = process.env.EVENTS_TOKEN
  if (!want) return false
  const header = req.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return false
  const a = Buffer.from(header.slice(7)), b = Buffer.from(want)
  return a.length === b.length && timingSafeEqual(a, b)
}
