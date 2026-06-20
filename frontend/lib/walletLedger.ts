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
  const { data, error } = await supabaseAdmin.rpc('credit_completed_consultation', {
    p_provider_id: input.providerId,
    p_patient_id: input.patientId,
    p_appointment_id: input.appointmentId,
    p_appointment_type: input.appointmentType || null,
    p_created_by: input.createdBy || input.providerId,
  })

  if (!error) return (data || { credited: false }) as WalletCreditResult

  await supabaseAdmin.rpc('record_failed_wallet_credit', {
    p_provider_id: input.providerId,
    p_patient_id: input.patientId,
    p_appointment_id: input.appointmentId,
    p_reason: errorMessage(error),
    p_created_by: input.createdBy || input.providerId,
  })
  throw new Error(errorMessage(error))
}
