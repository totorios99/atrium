import { NextResponse } from 'next/server'
import { config } from '@/vault.config.js'
import { readStatus } from '@/lib/vault.js'

export async function GET() {
  return NextResponse.json(config.vaults.map(readStatus))
}
