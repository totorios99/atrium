import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'

// Hype clips live outside the app (/srv/media/hype, owned by homelab's pipeline).
// manifest.json is re-read on every request, so new clips need no redeploy.
const HYPE_DIR = process.env.HYPE_DIR || '/srv/media/hype'
const OK_RE    = /^(manifest\.json|clips\/[\w-]+\.(mp4|jpg))$/   // no slashes or dots beyond these → no traversal
const TYPES    = { json: 'application/json', mp4: 'video/mp4', jpg: 'image/jpeg' }

const notFound = () => new Response('Not found', { status: 404 })

export async function GET(req, { params }) {
  const rel = (await params).path.join('/')
  if (!OK_RE.test(rel)) return notFound()
  const file = path.join(/*turbopackIgnore: true*/ HYPE_DIR, rel)
  let size
  try { size = (await fs.promises.stat(/*turbopackIgnore: true*/ file)).size } catch { return notFound() }

  const headers = {
    'Content-Type': TYPES[rel.split('.').pop()],
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    // a clip id can be re-encoded in place, so no immutable
    'Cache-Control': rel === 'manifest.json' ? 'no-cache' : 'public, max-age=3600',
  }

  // Safari/iOS refuse to play video without 206 range responses
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '')
  if (m && (m[1] || m[2])) {
    const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1])
    const end   = m[1] !== '' && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    return new Response(Readable.toWeb(fs.createReadStream(/*turbopackIgnore: true*/ file, { start, end })), {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    })
  }
  return new Response(Readable.toWeb(fs.createReadStream(/*turbopackIgnore: true*/ file)), {
    headers: { ...headers, 'Content-Length': String(size) },
  })
}
