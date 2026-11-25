import { NextResponse } from 'next/server'
import { authorized } from '@/lib/auth.js'
import { pending, replace, dismiss } from '@/lib/recruiter.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ mails: await pending() })
}

// The host script sends the full list each run: [{ id, date, from, subject }]
export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.mails) || body.mails.length > 200) return NextResponse.json({ error: 'mails[] required' }, { status: 400 })
  const clean = body.mails.map(m => ({
    id: String(m.id ?? '').slice(0, 100), date: String(m.date ?? '').slice(0, 10),
    from: String(m.from ?? '').slice(0, 80), subject: String(m.subject ?? '').slice(0, 200),
  })).filter(m => m.id)
  await replace(clean)
  return NextResponse.json({ stored: clean.length })
}

// The panel's ×: a thread the rules flagged that is not a recruiter waiting on me
export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await dismiss(id.slice(0, 100))
  return NextResponse.json({ ok: true })
}
