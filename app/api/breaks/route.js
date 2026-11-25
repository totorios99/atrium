import { NextResponse } from 'next/server'
import { state, start, sync, known } from '@/lib/breaks.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  sync().catch(() => {})   // a poll also re-blocks a break that ran out
  return NextResponse.json({ breaks: await state() })
}

export async function POST(req) {
  const { service } = (await req.json().catch(() => null)) ?? {}
  if (!known(service)) return NextResponse.json({ error: 'unknown service' }, { status: 400 })
  try {
    await start(service)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
  return NextResponse.json({ breaks: await state() })
}
