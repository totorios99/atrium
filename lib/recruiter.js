import { prisma } from '@/lib/db.js'

// Recruiter mails waiting for my answer. The host script `recruiter-mail` (hugo-system) reads
// Thunderbird's index and posts the whole pending list; a reply in Sent removes a thread there.
// A dismissed thread stays hidden here, for the ones the rules got wrong.
const LIST = 'recruiter:pending', HIDDEN = 'recruiter:dismissed'

async function read(key, fallback) {
  const row = await prisma.setting.findUnique({ where: { key } })
  try { return row ? JSON.parse(row.value) : fallback } catch { return fallback }
}
const write = (key, value) => prisma.setting.upsert({ where: { key }, update: { value: JSON.stringify(value) }, create: { key, value: JSON.stringify(value) } })

export async function pending() {
  const [list, hidden] = await Promise.all([read(LIST, []), read(HIDDEN, [])])
  return list.filter(m => !hidden.includes(m.id))
}
export const replace = list => write(LIST, list)
export async function dismiss(id) {
  const hidden = await read(HIDDEN, [])
  if (!hidden.includes(id)) await write(HIDDEN, [...hidden, id].slice(-500))
}
