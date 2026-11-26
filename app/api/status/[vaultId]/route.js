import { NextResponse } from 'next/server'
import { config } from '@/vault.config.js'
import { readStatus, writeStatusField } from '@/lib/vault.js'

export async function GET(_req, { params }) {
  const { vaultId } = await params
  const vault = config.vaults.find(v => v.id === vaultId)
  if (!vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 })
  return NextResponse.json(readStatus(vault))
}

export async function PATCH(req, { params }) {
  const { vaultId } = await params
  const vault = config.vaults.find(v => v.id === vaultId)
  if (!vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 })

  try {
    writeStatusField(vault, await req.json())
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
