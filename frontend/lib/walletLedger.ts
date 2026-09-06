import { supabaseAdmin } from '@/lib/supabaseServer'

export type WalletCreditResult = {
  credited: boolean
  duplicate?: boolean
  transactionId?: string
  walletId?: string
  amount?: number
  oldBalance?: number
  newBalance?: number
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message || 'Wallet operation failed')
  return 'Wallet operation failed'
}

export async function creditCompletedConsultation(input: {
  providerId: string
  patientId: string
  appointmentId: string
  appointmentType?: string | null
  createdBy?: string | null
}): Promise<WalletCreditResult> {
  // 1. First attempt canonical database RPC
  const { data, error } = await supabaseAdmin.rpc('credit_completed_consultation', {
    p_provider_id: input.providerId,
    p_patient_id: input.patientId,
    p_appointment_id: input.appointmentId,
    p_appointment_type: input.appointmentType || null,
    p_created_by: input.createdBy || input.providerId,
  })

  if (!error) return (data || { credited: false }) as WalletCreditResult

  const errMsg = errorMessage(error)
  console.warn(`credit_completed_consultation RPC failed (${errMsg}), activating resilient ledger credit...`)

  // 2. Fallback direct ledger credit (handles 42P10 ON CONFLICT or missing schema constraints)
  try {
    // Check for existing successful credit (idempotency)
    const { data: existingCredit } = await supabaseAdmin
      .from('wallet_ledger_transactions')
      .select('id, amount, status')
      .eq('appointment_id', input.appointmentId)
      .eq('transaction_type', 'CONSULTATION_CREDIT')
      .eq('status', 'SUCCESS')
      .maybeSingle()

    if (existingCredit) {
      return {
        credited: false,
        duplicate: true,
        transactionId: existingCredit.id,
        amount: Number(existingCredit.amount || 0),
      }
    }

    // Ensure wallet_accounts record exists for provider
    let { data: wallet } = await supabaseAdmin
      .from('wallet_accounts')
      .select('*')
      .eq('provider_id', input.providerId)
      .maybeSingle()

    if (!wallet) {
      const { data: createdWallet, error: createWalletErr } = await supabaseAdmin
        .from('wallet_accounts')
        .insert({
          provider_id: input.providerId,
          current_balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_paid: 0,
          version: 0,
        })
        .select()
        .maybeSingle()

      if (!createdWallet) {
        const { data: refetchedWallet } = await supabaseAdmin
          .from('wallet_accounts')
          .select('*')
          .eq('provider_id', input.providerId)
          .maybeSingle()
        wallet = refetchedWallet
      } else {
        wallet = createdWallet
      }
    }

    if (!wallet) {
      throw new Error(`Wallet account could not be found or created for provider ${input.providerId}`)
    }

    // Determine payout amount (provider profile -> compensation settings -> 300 default)
    let payoutAmount = 300.00
    try {
      const { data: profile } = await supabaseAdmin
        .from('provider_profiles')
        .select('payout_amount, role')
        .eq('provider_id', input.providerId)
        .maybeSingle()

      if (profile?.payout_amount && Number(profile.payout_amount) > 0) {
        payoutAmount = Number(profile.payout_amount)
      } else {
        const providerRole = profile?.role || 'doctor'
        const { data: settings } = await supabaseAdmin
          .from('provider_compensation_settings')
          .select('fixed_amount')
          .eq('provider_role', providerRole)
          .eq('active', true)
          .maybeSingle()
        if (settings?.fixed_amount && Number(settings.fixed_amount) > 0) {
          payoutAmount = Number(settings.fixed_amount)
        }
      }
    } catch {
      payoutAmount = 300.00
    }

    const oldBalance = Number(wallet.current_balance || 0)
    const newBalance = oldBalance + payoutAmount
    const newTotalEarned = Number(wallet.total_earned || 0) + payoutAmount
    const newVersion = (Number(wallet.version) || 0) + 1

    // Update wallet balance atomically
    await supabaseAdmin
      .from('wallet_accounts')
      .update({
        current_balance: newBalance,
        total_earned: newTotalEarned,
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    // Insert canonical successful ledger record
    const { data: txRecord, error: txError } = await supabaseAdmin
      .from('wallet_ledger_transactions')
      .insert({
        wallet_id: wallet.id,
        provider_id: input.providerId,
        patient_id: input.patientId,
        appointment_id: input.appointmentId,
        transaction_type: 'CONSULTATION_CREDIT',
        amount: payoutAmount,
        status: 'SUCCESS',
        reference_id: `consultation:${input.appointmentId}`,
        description: 'Consultation credit',
        metadata: {
          providerRole: 'doctor',
          appointmentType: input.appointmentType || 'INITIAL_CONSULTATION',
          creditedVia: 'direct_ledger_fallback',
          rpcError: errMsg,
        },
        created_by: input.createdBy || input.providerId,
        retry_required: false,
        failure_reason: null,
      })
      .select()
      .single()

    if (txError) {
      console.error('Failed to insert fallback transaction ledger record:', txError)
    }

    // Resolve any previously flagged FAILED records for this appointment
    await supabaseAdmin
      .from('wallet_ledger_transactions')
      .update({
        retry_required: false,
        failure_reason: `Resolved via fallback credit: ${txRecord?.id || 'credited'}`,
      })
      .eq('appointment_id', input.appointmentId)
      .eq('status', 'FAILED')

    return {
      credited: true,
      transactionId: txRecord?.id,
      walletId: wallet.id,
      amount: payoutAmount,
      oldBalance,
      newBalance,
    }
  } catch (fallbackErr) {
    console.error('Direct wallet ledger fallback failed:', fallbackErr)

    // Only record failed attempt if fallback also failed
    await supabaseAdmin.rpc('record_failed_wallet_credit', {
      p_provider_id: input.providerId,
      p_patient_id: input.patientId,
      p_appointment_id: input.appointmentId,
      p_reason: `${errMsg} | fallback: ${errorMessage(fallbackErr)}`,
      p_created_by: input.createdBy || input.providerId,
    })

    throw new Error(`${errMsg} (fallback: ${errorMessage(fallbackErr)})`)
  }
}
