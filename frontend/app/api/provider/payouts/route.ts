import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const provider = await getAuthenticatedProvider(request)
    if ('error' in provider) return NextResponse.json({ error: provider.error }, { status: provider.status })

    const userId = provider.user.id
    const profileId = provider.profile?.id || userId

    const { data: v2Profile } = await supabaseAdmin
      .from('provider_profiles_v2')
      .select('id')
      .or(`id.eq.${userId},user_id.eq.${userId},id.eq.${profileId},user_id.eq.${profileId}`)
      .maybeSingle()

    const v2Id = v2Profile?.id || null

    const [{ data: v3Payouts }, { data: legPayouts }, { data: docTx }] = await Promise.all([
      v2Id
        ? supabaseAdmin.from('provider_payout_records').select('*').or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`).order('created_at', { ascending: false }).limit(50)
        : supabaseAdmin.from('provider_payout_records').select('*').eq('provider_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('provider_payouts').select('*').or(`provider_id.eq.${userId},provider_id.eq.${profileId}`).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('doctor_wallet_transactions').select('*').or(`doctor_id.eq.${userId},doctor_id.eq.${profileId}`).or('type.ilike.%withdrawal%,payout_status.neq.null').order('created_at', { ascending: false }).limit(50),
    ])

    const allPayouts = [
      ...(v3Payouts || []).map((p: any) => {
        const amt = Number(p.net_amount ?? p.gross_amount ?? 0)
        let status = String(p.status || 'PENDING').toUpperCase()
        if (status === 'SUCCESS') status = 'COMPLETED'
        return {
          id: p.id,
          payout_amount: amt,
          net_amount: amt,
          gross_amount: Number(p.gross_amount ?? amt),
          amount: amt,
          payout_status: status,
          status,
          failure_reason: p.failure_reason || null,
          initiated_at: p.initiated_at || p.created_at,
          created_at: p.created_at,
          payout_provider: 'Bank / UPI',
        }
      }),
      ...(legPayouts || []).map((p: any) => {
        const amt = Number(p.payout_amount || 0)
        const status = String(p.payout_status || 'PENDING').toUpperCase()
        return {
          id: p.id,
          payout_amount: amt,
          net_amount: amt,
          gross_amount: amt,
          amount: amt,
          payout_status: status,
          status,
          failure_reason: p.failure_reason || null,
          initiated_at: p.initiated_at || p.created_at,
          created_at: p.created_at,
          payout_provider: 'Bank / UPI',
        }
      }),
      ...(docTx || []).map((t: any) => {
        const amt = Math.abs(Number(t.amount || 0))
        let status = String(t.payout_status || t.status || 'PENDING').toUpperCase()
        if (status === 'PAID' || status === 'CREDITED') status = 'COMPLETED'
        return {
          id: t.id,
          payout_amount: amt,
          net_amount: amt,
          gross_amount: amt,
          amount: amt,
          payout_status: status,
          status,
          failure_reason: null,
          initiated_at: t.created_at,
          created_at: t.created_at,
          payout_provider: 'Bank / UPI',
        }
      }),
    ]

    const seen = new Set<string>()
    const payouts = allPayouts.filter(p => {
      if (!p.id || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    }).sort((a, b) => new Date(b.created_at || b.initiated_at || 0).getTime() - new Date(a.created_at || a.initiated_at || 0).getTime())

    return NextResponse.json({ payouts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load payouts.' }, { status: 500 })
  }
}
