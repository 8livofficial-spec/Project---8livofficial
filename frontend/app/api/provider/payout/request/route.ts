import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const provider = await getAuthenticatedProvider(request)
    if ('error' in provider) return NextResponse.json({ error: provider.error }, { status: provider.status })
    const body = await request.json()
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'A valid payout amount is required.' }, { status: 400 })
    const idempotencyKey = String(body.idempotencyKey || `provider:${provider.user.id}:${randomUUID()}`)
    const { data, error } = await supabaseAdmin.rpc('request_provider_payout', {
      p_provider_id: provider.user.id,
      p_amount: amount,
      p_idempotency_key: idempotencyKey,
      p_initiated_by: provider.user.id,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 409 })
    return NextResponse.json({ payout: data }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to request payout.' }, { status: 500 })
  }
}
