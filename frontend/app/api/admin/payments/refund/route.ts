import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-refund:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const { paymentId, reason } = await request.json()
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'refund_requested',
        metadata: { refund_reason: reason || 'Admin requested refund' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to request refund.' }, { status: 500 })
  }
}
