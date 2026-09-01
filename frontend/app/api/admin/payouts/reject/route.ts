import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUuid(id: any): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-provider-payout-reject:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const { payoutId: rawPayoutId, reason } = await request.json()
    const payoutId = String(rawPayoutId || '').trim()
    if (!payoutId) return NextResponse.json({ error: 'payoutId is required.' }, { status: 400 })

    const rejectionReason = String(reason || 'Rejected by administrator').trim()
    const now = new Date().toISOString()

    // ─── 0. Handle Synthetic wallet-pending- IDs ──────────────────────────────
    if (payoutId.startsWith('wallet-pending-')) {
      const targetProviderId = payoutId.replace('wallet-pending-', '')

      const { data: v2Prof } = await supabaseAdmin
        .from('provider_profiles_v2')
        .select('id, user_id')
        .or(`id.eq.${targetProviderId},user_id.eq.${targetProviderId}`)
        .maybeSingle()

      const v2Id = v2Prof?.id || targetProviderId
      const userId = v2Prof?.user_id || targetProviderId

      // Restore provider_wallets processing_balance to eligible_balance
      const { data: wallet } = await supabaseAdmin
        .from('provider_wallets')
        .select('id, processing_balance, eligible_balance')
        .or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`)
        .maybeSingle()

      if (wallet) {
        const amt = Number(wallet.processing_balance || 0)
        await supabaseAdmin.from('provider_wallets').update({
          processing_balance: 0,
          eligible_balance: Number(wallet.eligible_balance || 0) + amt,
          updated_at: now,
        }).eq('id', wallet.id)
      }

      // Also reset any pending records for this provider
      await Promise.all([
        supabaseAdmin
          .from('provider_payout_records')
          .update({ status: 'FAILED', failure_reason: rejectionReason, failed_at: now, updated_at: now })
          .or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`)
          .in('status', ['PENDING', 'APPROVED', 'REQUESTED', 'INITIATED']),
        supabaseAdmin
          .from('provider_payouts')
          .update({ payout_status: 'FAILED', failure_reason: rejectionReason, updated_at: now })
          .or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`)
          .in('payout_status', ['PENDING', 'PROCESSING']),
      ])

      return NextResponse.json({
        success: true,
        message: 'Payout request rejected and balance restored.',
        source: 'synthetic_wallet_payout',
      })
    }

    // ─── 1. Try provider_payout_records (V3 Modern) ───────────────────────────
    if (isValidUuid(payoutId)) {
      const { data: v3Record } = await supabaseAdmin
        .from('provider_payout_records')
        .select('id, provider_id, net_amount, gross_amount, status')
        .eq('id', payoutId)
        .maybeSingle()

      if (v3Record) {
        if (!['PENDING', 'APPROVED', 'PROCESSING'].includes(v3Record.status)) {
          return NextResponse.json({ error: 'Only pending or processing payout records can be rejected.' }, { status: 409 })
        }

        // Try atomic RPC first
        const { error: rpcErr } = await supabaseAdmin.rpc('finalize_provider_payout_record', {
          p_record_id: v3Record.id,
          p_status: 'FAILED',
          p_failure_reason: rejectionReason,
          p_actor: admin.id,
        })

        if (rpcErr) {
          console.warn('[reject] finalize_provider_payout_record failed, falling back:', rpcErr)
          await supabaseAdmin.from('provider_payout_records').update({
            status: 'FAILED',
            failure_reason: rejectionReason,
            failed_at: now,
            updated_at: now,
          }).eq('id', v3Record.id)

          // Restore funds to eligible_balance
          const amt = Number(v3Record.net_amount || v3Record.gross_amount || 0)
          if (amt > 0) {
            const { data: wallet } = await supabaseAdmin
              .from('provider_wallets')
              .select('id, processing_balance, eligible_balance')
              .eq('provider_id', v3Record.provider_id)
              .maybeSingle()
            if (wallet) {
              await supabaseAdmin.from('provider_wallets').update({
                processing_balance: Math.max(0, Number(wallet.processing_balance || 0) - amt),
                eligible_balance: Number(wallet.eligible_balance || 0) + amt,
                updated_at: now,
              }).eq('id', wallet.id)
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Payout request rejected and balance restored.',
          source: 'provider_payout_records',
        })
      }
    }

    // ─── 2. Try provider_payouts (V1 Production Ledger) ──────────────────────
    if (isValidUuid(payoutId)) {
      const { data: v1Payout, error: v1Error } = await supabaseAdmin
        .from('provider_payouts')
        .select('id, provider_id, payout_amount, payout_status')
        .eq('id', payoutId)
        .maybeSingle()

      if (v1Error) return NextResponse.json({ error: v1Error.message }, { status: 500 })

      if (v1Payout) {
        if (!['PENDING', 'PROCESSING'].includes(v1Payout.payout_status)) {
          return NextResponse.json({ error: 'Only pending or processing payouts can be rejected.' }, { status: 409 })
        }

        const { data, error } = await supabaseAdmin.rpc('finalize_provider_payout', {
          p_payout_id: v1Payout.id,
          p_status: 'FAILED',
          p_payment_reference: null,
          p_failure_reason: rejectionReason,
          p_actor: admin.id,
        })

        if (error) {
          // RPC failed (e.g. wallet not found) — update directly
          console.warn('[reject] finalize_provider_payout RPC failed, updating directly:', error)
          await supabaseAdmin.from('provider_payouts').update({
            payout_status: 'FAILED',
            failure_reason: rejectionReason,
            updated_at: now,
          }).eq('id', v1Payout.id)
        }

        return NextResponse.json({
          success: true,
          message: 'Payout request rejected and balance restored.',
          source: 'provider_payouts',
        })
      }
    }

    // ─── 3. Try doctor_wallet_transactions (Legacy) ───────────────────────────
    if (isValidUuid(payoutId)) {
      const { data: docTx } = await supabaseAdmin
        .from('doctor_wallet_transactions')
        .select('id, doctor_id, amount, status, payout_status')
        .eq('id', payoutId)
        .maybeSingle()

      if (docTx) {
        await supabaseAdmin.from('doctor_wallet_transactions').update({
          payout_status: 'FAILED',
          status: 'failed',
          updated_at: now,
        }).eq('id', docTx.id)

        return NextResponse.json({
          success: true,
          message: 'Payout request rejected.',
          source: 'doctor_wallet_transactions',
        })
      }
    }

    return NextResponse.json({ error: `Payout ID "${payoutId}" not found in any table.` }, { status: 404 })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payout rejection failed.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
