import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createRazorpayXContact, createRazorpayXFundAccount, createRazorpayXPayout } from '@/lib/razorpayx'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-provider-payout-process:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const { payoutId } = await request.json()
    if (!payoutId) return NextResponse.json({ error: 'payoutId is required.' }, { status: 400 })

    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('provider_payouts')
      .select('id, provider_id, payout_amount, payout_status')
      .eq('id', payoutId)
      .maybeSingle()
    if (payoutError) return NextResponse.json({ error: payoutError.message }, { status: 500 })
    if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 })
    if (!['PENDING', 'FAILED'].includes(payout.payout_status)) return NextResponse.json({ error: 'Payout is already being processed.' }, { status: 409 })

    const [{ data: profile }, { data: account }] = await Promise.all([
      supabaseAdmin.from('profiles').select('first_name,last_name,email,phone_number').eq('id', payout.provider_id).maybeSingle(),
      supabaseAdmin
        .from('doctor_payout_accounts')
        .select('account_type, beneficiary_name, account_number, ifsc, vpa, razorpay_contact_id, razorpay_fund_account_id')
        .eq('doctor_id', payout.provider_id)
        .maybeSingle(),
    ])
    if (!profile || !account) return NextResponse.json({ error: 'Provider payout account is not configured.' }, { status: 409 })

    const { data: reserved } = await supabaseAdmin.from('provider_payouts').update({ payout_status: 'PROCESSING', failure_reason: null, updated_at: new Date().toISOString() }).eq('id', payout.id).in('payout_status', ['PENDING', 'FAILED']).select('id').maybeSingle()
    if (!reserved) return NextResponse.json({ error: 'Payout was reserved by another process.' }, { status: 409 })

    try {
      const name = account.beneficiary_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '8liv Provider'
      let contactId = account.razorpay_contact_id
      if (!contactId) contactId = (await createRazorpayXContact({ name, email: profile.email, contact: profile.phone_number, referenceId: payout.provider_id })).id
      let fundAccountId = account.razorpay_fund_account_id
      if (!fundAccountId) fundAccountId = (await createRazorpayXFundAccount({ contactId, accountType: account.account_type, name, ifsc: account.ifsc, accountNumber: account.account_number, vpa: account.vpa })).id
      await supabaseAdmin.from('doctor_payout_accounts').update({ razorpay_contact_id: contactId, razorpay_fund_account_id: fundAccountId, updated_at: new Date().toISOString() }).eq('doctor_id', payout.provider_id)
      const razorpayPayout = await createRazorpayXPayout({ fundAccountId, amountPaise: Math.round(Number(payout.payout_amount) * 100), mode: account.account_type === 'vpa' ? 'UPI' : 'IMPS', referenceId: payout.id, narration: '8liv provider payout', notes: { payoutId: payout.id, providerId: payout.provider_id } })
      const { data, error } = await supabaseAdmin.rpc('finalize_provider_payout', { p_payout_id: payout.id, p_status: 'PROCESSING', p_payment_reference: razorpayPayout.id, p_failure_reason: null, p_actor: admin.id })
      if (error) throw error
      return NextResponse.json({ payout: data, razorpayStatus: razorpayPayout.status })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payout processing failed.'
      await supabaseAdmin.rpc('finalize_provider_payout', { p_payout_id: payout.id, p_status: 'FAILED', p_payment_reference: null, p_failure_reason: message, p_actor: admin.id })
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payout processing failed.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 502)
    return NextResponse.json({ error: message }, { status })
  }
}
