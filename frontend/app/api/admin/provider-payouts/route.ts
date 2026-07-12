import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

export async function PATCH(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-provider-payouts:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const { transactionId, payoutStatus, transactionStatus } = await request.json()
    if (!transactionId || (!payoutStatus && !transactionStatus)) {
      return NextResponse.json({ error: 'transactionId and payoutStatus or transactionStatus are required.' }, { status: 400 })
    }

    const updates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (payoutStatus) updates.payout_status = payoutStatus
    if (transactionStatus) updates.status = transactionStatus

    const { error } = await supabaseAdmin
      .from('doctor_wallet_transactions')
      .update(updates)
      .eq('id', transactionId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update payout.' }, { status: 500 })
  }
}
