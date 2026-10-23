import path from 'path'
import fs   from 'fs/promises'

// Uploaded inbox photos. Docker: MEDIA_DIR=/data/inbox-media (on the db volume).
export const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), 'prisma', 'inbox-media')

// raster images only — no SVG (scriptable)
export const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/avif': 'avif', 'image/heic': 'heic',
}
export const MAX_BYTES = 10 * 1024 * 1024
export const FILE_RE   = /^[0-9a-f-]{36}\.[a-z]{3,4}$/

export function serialize(item) {
  let meta = null
  try { meta = item.meta ? JSON.parse(item.meta) : null } catch { /* bad JSON → ignore */ }
  return {
    ...item,
    meta,
    media: (item.media ?? []).map(m => ({ id: m.id, mime: m.mime, url: `/api/inbox/media/${m.file}` })),
  }
}

export async function unlinkMedia(files) {
  await Promise.all(files.map(f => fs.unlink(path.join(MEDIA_DIR, f)).catch(() => {})))
}
