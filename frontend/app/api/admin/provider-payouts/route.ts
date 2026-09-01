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
    const payoutStatus = String(body.payoutStatus || body.transactionStatus || body.status || '').toUpperCase()
    const paymentReference = body.paymentReference || body.reference || 'MANUAL_PAYOUT_APPROVED'
    const notes = body.notes || body.reason || null

    if (!payoutId || !payoutStatus) {
      return NextResponse.json({ error: 'payoutId and status are required.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const isCompleted = ['COMPLETED', 'PAID', 'SUCCESS', 'PROCESSED'].includes(payoutStatus)
    const isFailed = ['FAILED', 'REJECTED', 'CANCELLED'].includes(payoutStatus)
    const isProcessing = ['PROCESSING', 'PENDING'].includes(payoutStatus)

    const normalizedStatus = isCompleted ? 'COMPLETED' : (isFailed ? 'FAILED' : 'PROCESSING')

    let matched = false

    // 1. Check provider_payouts table
    const { data: payoutRow } = await supabaseAdmin
      .from('provider_payouts')
      .select('id, provider_id, payout_amount, payout_status, wallet_id')
      .eq('id', payoutId)
      .maybeSingle()

    if (payoutRow) {
      matched = true
      if (isCompleted) {
        try {
          await supabaseAdmin.rpc('finalize_provider_payout', {
            p_payout_id: payoutRow.id,
            p_status: 'COMPLETED',
            p_payment_reference: paymentReference,
            p_failure_reason: null,
            p_actor: admin.id,
          })
        } catch (rpcErr) {
          console.warn('finalize_provider_payout RPC failed, updating directly:', rpcErr)
          await supabaseAdmin
            .from('provider_payouts')
            .update({ payout_status: 'COMPLETED', payment_reference: paymentReference, completed_at: now, updated_at: now })
            .eq('id', payoutRow.id)

          // Direct ledger update
          if (payoutRow.wallet_id) {
            await supabaseAdmin.rpc('recalculate_wallet_account', { p_wallet_id: payoutRow.wallet_id })
          }
        }
      } else if (isFailed) {
        try {
          await supabaseAdmin.rpc('finalize_provider_payout', {
            p_payout_id: payoutRow.id,
            p_status: 'FAILED',
            p_payment_reference: null,
            p_failure_reason: notes || 'Rejected by admin',
            p_actor: admin.id,
          })
        } catch (rpcErr) {
          await supabaseAdmin
            .from('provider_payouts')
            .update({ payout_status: 'FAILED', failure_reason: notes, updated_at: now })
            .eq('id', payoutRow.id)
        }
      } else {
        await supabaseAdmin
          .from('provider_payouts')
          .update({ payout_status: 'PROCESSING', updated_at: now })
          .eq('id', payoutRow.id)
      }
    }

    // 2. Check provider_payout_records (V2 / V3 table)
    const { data: v2Payout } = await supabaseAdmin
      .from('provider_payout_records')
      .select('id, provider_id, net_amount, gross_amount, status')
      .eq('id', payoutId)
      .maybeSingle()

    if (v2Payout) {
      matched = true
      const v2Status = isCompleted ? 'SUCCESS' : (isFailed ? 'FAILED' : 'APPROVED')
      await supabaseAdmin
        .from('provider_payout_records')
        .update({
          status: v2Status,
          processed_at: isCompleted || isProcessing ? now : null,
          completed_at: isCompleted ? now : null,
          failed_at: isFailed ? now : null,
          failure_reason: isFailed ? notes : null,
          updated_at: now,
        })
        .eq('id', v2Payout.id)

      // Synchronize provider_wallets balances
      const amt = Number(v2Payout.net_amount || v2Payout.gross_amount || 0)
      if (amt > 0) {
        const { data: currentWallet } = await supabaseAdmin
          .from('provider_wallets')
          .select('id, processing_balance, paid_total, eligible_balance')
          .eq('provider_id', v2Payout.provider_id)
          .maybeSingle()

        if (currentWallet) {
          if (isCompleted) {
            await supabaseAdmin
              .from('provider_wallets')
              .update({
                processing_balance: Math.max(0, Number(currentWallet.processing_balance || 0) - amt),
                paid_total: Number(currentWallet.paid_total || 0) + amt,
                updated_at: now,
              })
              .eq('id', currentWallet.id)
          } else if (isFailed) {
            // Restore funds to eligible_balance
            await supabaseAdmin
              .from('provider_wallets')
              .update({
                processing_balance: Math.max(0, Number(currentWallet.processing_balance || 0) - amt),
                eligible_balance: Number(currentWallet.eligible_balance || 0) + amt,
                updated_at: now,
              })
              .eq('id', currentWallet.id)
          }
        }
      }
    }

    // 3. Check doctor_wallet_transactions (Legacy table)
    const { data: docTx } = await supabaseAdmin
      .from('doctor_wallet_transactions')
      .select('id, doctor_id, amount, status')
      .eq('id', payoutId)
      .maybeSingle()

    if (docTx) {
      matched = true
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
          await supabaseAdmin
            .from('doctor_wallet')
            .update({
              total_withdrawn: Number(docW.total_withdrawn || 0) + amt,
              balance: Math.max(0, Number(docW.balance || 0) - amt),
              updated_at: now,
            })
            .eq('doctor_id', docTx.doctor_id)
        }
      }
    }

    // 4. Check wallet_ledger_transactions
    await supabaseAdmin
      .from('wallet_ledger_transactions')
      .update({
        status: isCompleted ? 'SUCCESS' : (isFailed ? 'FAILED' : 'PENDING'),
        updated_at: now,
      })
      .eq('id', payoutId)

    if (!matched) {
      // Fallback: try updating by reference or search in all tables
      await Promise.all([
        supabaseAdmin.from('provider_payouts').update({ payout_status: normalizedStatus, updated_at: now }).eq('id', payoutId),
        supabaseAdmin.from('provider_payout_records').update({ status: isCompleted ? 'SUCCESS' : normalizedStatus, updated_at: now }).eq('id', payoutId),
        supabaseAdmin.from('doctor_wallet_transactions').update({ payout_status: normalizedStatus, status: isCompleted ? 'paid' : 'pending', updated_at: now }).eq('id', payoutId),
      ])
    }

    return NextResponse.json({
      success: true,
      message: `Payout marked as ${normalizedStatus}.`,
      status: normalizedStatus,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update payout.' }, { status: 500 })
  }
}
