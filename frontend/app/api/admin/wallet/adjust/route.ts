import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-wallet-adjust:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const body = await request.json()
    const providerId = String(body.providerId || '')
    const amount = Number(body.amount)
    const reason = String(body.reason || '').trim()
    if (!providerId || !Number.isFinite(amount) || amount === 0 || !reason) return NextResponse.json({ error: 'providerId, non-zero amount, and reason are required.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.rpc('adjust_provider_wallet', {
      p_provider_id: providerId,
      p_amount: amount,
      p_reason: reason,
      p_admin_id: admin.id,
      p_reference_id: String(body.referenceId || `adjustment:${randomUUID()}`),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 409 })
    return NextResponse.json({ adjustment: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to adjust wallet.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
