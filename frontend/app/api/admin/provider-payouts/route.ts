import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

export async function PATCH(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-provider-payouts:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const body = await request.json()
    const payoutId = body.transactionId || body.payoutId || body.id
    const rawStatus = String(body.payoutStatus || body.transactionStatus || body.status || '').toUpperCase()
    const paymentReference = body.paymentReference || body.reference || 'MANUAL_PAYOUT_APPROVED'
    const notes = body.notes || body.reason || null

    if (!payoutId || !rawStatus) {
      return NextResponse.json({ error: 'payoutId and status are required.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const isCompleted = ['COMPLETED', 'PAID', 'SUCCESS', 'PROCESSED'].includes(rawStatus)
    const isFailed = ['FAILED', 'REJECTED', 'CANCELLED'].includes(rawStatus)
    const normalizedStatus = isCompleted ? 'COMPLETED' : (isFailed ? 'FAILED' : 'PROCESSING')

    // ─── 1. provider_payout_records (V3 / Modern path) ───────────────────────────
    const { data: v3Record } = await supabaseAdmin
      .from('provider_payout_records')
      .select('id, provider_id, net_amount, gross_amount, status')
      .eq('id', payoutId)
      .maybeSingle()

    if (v3Record) {
      // Try the new atomic RPC first; fall back to direct UPDATE
      const rpcStatus = isCompleted ? 'SUCCESS' : (isFailed ? 'FAILED' : 'APPROVED')
      const { error: rpcErr } = await supabaseAdmin.rpc('finalize_provider_payout_record', {
        p_record_id: v3Record.id,
        p_status: rpcStatus,
        p_failure_reason: isFailed ? (notes || 'Rejected by admin') : null,
        p_actor: admin.id,
      })

      if (rpcErr) {
        console.warn('[provider-payouts PATCH] finalize_provider_payout_record RPC failed, updating directly:', rpcErr)
        await supabaseAdmin
          .from('provider_payout_records')
          .update({
            status: rpcStatus,
            processed_at: isCompleted || !isFailed ? now : null,
            completed_at: isCompleted ? now : null,
            failed_at: isFailed ? now : null,
            failure_reason: isFailed ? (notes || 'Rejected by admin') : null,
            updated_at: now,
          })
          .eq('id', v3Record.id)

        // Manual wallet sync
        const amt = Number(v3Record.net_amount || v3Record.gross_amount || 0)
        if (amt > 0) {
          const { data: wallet } = await supabaseAdmin
            .from('provider_wallets')
            .select('id, processing_balance, paid_total, eligible_balance')
            .eq('provider_id', v3Record.provider_id)
            .maybeSingle()

          if (wallet) {
            if (isCompleted) {
              await supabaseAdmin.from('provider_wallets').update({
                processing_balance: Math.max(0, Number(wallet.processing_balance || 0) - amt),
                paid_total: Number(wallet.paid_total || 0) + amt,
                updated_at: now,
              }).eq('id', wallet.id)
            } else if (isFailed) {
              await supabaseAdmin.from('provider_wallets').update({
                processing_balance: Math.max(0, Number(wallet.processing_balance || 0) - amt),
                eligible_balance: Number(wallet.eligible_balance || 0) + amt,
                updated_at: now,
              }).eq('id', wallet.id)
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Payout marked as ${normalizedStatus}.`,
        status: normalizedStatus,
        source: 'provider_payout_records',
      })
    }

    // ─── 2. provider_payouts (V1 / Production Ledger) ────────────────────────────
    const { data: v1Payout } = await supabaseAdmin
      .from('provider_payouts')
      .select('id, provider_id, payout_amount, payout_status, wallet_id')
      .eq('id', payoutId)
      .maybeSingle()

    if (v1Payout) {
      if (isCompleted || isFailed) {
        const { error: rpcErr } = await supabaseAdmin.rpc('finalize_provider_payout', {
          p_payout_id: v1Payout.id,
          p_status: isCompleted ? 'COMPLETED' : 'FAILED',
          p_payment_reference: isCompleted ? paymentReference : null,
          p_failure_reason: isFailed ? (notes || 'Rejected by admin') : null,
          p_actor: admin.id,
        })

        if (rpcErr) {
          console.warn('[provider-payouts PATCH] finalize_provider_payout RPC failed, updating directly:', rpcErr)
          await supabaseAdmin
            .from('provider_payouts')
            .update({
              payout_status: isCompleted ? 'COMPLETED' : 'FAILED',
              payment_reference: isCompleted ? paymentReference : undefined,
              failure_reason: isFailed ? (notes || 'Rejected by admin') : null,
              completed_at: isCompleted ? now : null,
              updated_at: now,
            })
            .eq('id', v1Payout.id)

          if (v1Payout.wallet_id) {
            try { await supabaseAdmin.rpc('recalculate_wallet_account', { p_wallet_id: v1Payout.wallet_id }) } catch (_) {}
          }
        }
      } else {
        await supabaseAdmin
          .from('provider_payouts')
          .update({ payout_status: 'PROCESSING', updated_at: now })
          .eq('id', v1Payout.id)
      }

      return NextResponse.json({
        success: true,
        message: `Payout marked as ${normalizedStatus}.`,
        status: normalizedStatus,
        source: 'provider_payouts',
      })
    }

    // ─── 3. doctor_wallet_transactions (Legacy) ───────────────────────────────────
    const { data: docTx } = await supabaseAdmin
      .from('doctor_wallet_transactions')
      .select('id, doctor_id, amount, status, payout_status')
      .eq('id', payoutId)
      .maybeSingle()

    if (docTx) {
      const txStatus = isCompleted ? 'paid' : (isFailed ? 'failed' : 'processing')
      await supabaseAdmin
        .from('doctor_wallet_transactions')
        .update({
          payout_status: normalizedStatus,
          status: txStatus,
          updated_at: now,
        })
        .eq('id', docTx.id)

      if (isCompleted && docTx.doctor_id) {
        const amt = Math.abs(Number(docTx.amount || 0))
        const { data: docW } = await supabaseAdmin
          .from('doctor_wallet')
          .select('balance, total_withdrawn')
          .eq('doctor_id', docTx.doctor_id)
          .maybeSingle()

        if (docW) {
          await supabaseAdmin.from('doctor_wallet').update({
            total_withdrawn: Number(docW.total_withdrawn || 0) + amt,
            balance: Math.max(0, Number(docW.balance || 0) - amt),
            updated_at: now,
          }).eq('doctor_id', docTx.doctor_id)
        } else if (isFailed) {
          // Nothing to restore for legacy — balance tracking is on doctor_wallet
        }
      }

      return NextResponse.json({
        success: true,
        message: `Payout marked as ${normalizedStatus}.`,
        status: normalizedStatus,
        source: 'doctor_wallet_transactions',
      })
    }

    // ─── 4. wallet_ledger_transactions ────────────────────────────────────────────
    const { data: ledgerTx } = await supabaseAdmin
      .from('wallet_ledger_transactions')
      .select('id, provider_id, amount, status')
      .eq('id', payoutId)
      .maybeSingle()

    if (ledgerTx) {
      await supabaseAdmin
        .from('wallet_ledger_transactions')
        .update({
          status: isCompleted ? 'SUCCESS' : (isFailed ? 'FAILED' : 'PENDING'),
          updated_at: now,
        })
        .eq('id', payoutId)

      return NextResponse.json({
        success: true,
        message: `Payout marked as ${normalizedStatus}.`,
        status: normalizedStatus,
        source: 'wallet_ledger_transactions',
      })
    }

    return NextResponse.json({ error: `Payout ID "${payoutId}" not found in any table.` }, { status: 404 })

  } catch (err: any) {
    console.error('[provider-payouts PATCH] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update payout.' }, { status: 500 })
  }
}
