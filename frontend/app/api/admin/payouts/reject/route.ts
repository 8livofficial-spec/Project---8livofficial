import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-provider-payout-reject:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const { payoutId, reason } = await request.json()
    if (!payoutId) return NextResponse.json({ error: 'payoutId is required.' }, { status: 400 })

    const rejectionReason = String(reason || 'Rejected by administrator').trim()

    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('provider_payouts')
      .select('id, provider_id, payout_amount, payout_status')
      .eq('id', payoutId)
      .maybeSingle()

    if (payoutError) return NextResponse.json({ error: payoutError.message }, { status: 500 })
    if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 })
    if (!['PENDING', 'PROCESSING'].includes(payout.payout_status)) {
      return NextResponse.json({ error: 'Only pending or processing payouts can be rejected.' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin.rpc('finalize_provider_payout', {
      p_payout_id: payout.id,
      p_status: 'FAILED',
      p_payment_reference: null,
      p_failure_reason: rejectionReason,
      p_actor: admin.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, payout: data, message: 'Payout request rejected and balance restored.' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payout rejection failed.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
