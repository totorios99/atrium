import fs   from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { getWeekNumber, setNested } from '@/utils/shared.js'

export function statusPath(vault) {
  return path.join(vault.path, 'STATUS.md')
}

export function readStatus(vault) {
  const filePath = statusPath(vault)
  if (!fs.existsSync(filePath)) {
    return { error: `STATUS.md not found at ${filePath}`, vault_id: vault.id }
  }
  try {
    const raw    = fs.readFileSync(filePath, 'utf8')
    const parsed = matter(raw)

    return {
      ...parsed.data,
      vault_id:    vault.id,
      vault_label: vault.label,
      vault_color: vault.color,
      vault_name:  path.basename(vault.path),
      _found:      true,
    }
  } catch (e) {
    return { error: e.message, vault_id: vault.id }
  }
}

export function writeStatusField(vault, updates) {
  const filePath = statusPath(vault)
  if (!fs.existsSync(filePath)) throw new Error(`STATUS.md not found at ${filePath}`)
  const raw    = fs.readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  let   data   = { ...parsed.data }
  for (const [key, val] of Object.entries(updates)) {
    data = setNested(data, key, val)
  }
  const newContent = matter.stringify(parsed.content || '', data)
  fs.writeFileSync(filePath, newContent, 'utf8')
}

export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function currentWeekKey() {
  const today   = new Date()
  const weekNum = getWeekNumber(today)
  return `${today.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}
