import { supabaseAdmin } from '@/lib/supabaseServer'
import { creditCompletedConsultation } from '@/lib/walletLedger'

export async function completeDietitianConsultationWithWalletCredit(input: {
  patientId: string
  dietitianId: string
  appointmentId?: string | null
}) {
  const { patientId, dietitianId, appointmentId } = input
  const now = new Date().toISOString()

  let query = supabaseAdmin
    .from('staff_consultations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('staff_id', dietitianId)
    .in('status', ['attended', 'scheduled', 'calling'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (appointmentId) {
    query = supabaseAdmin
      .from('staff_consultations')
      .select('*')
      .eq('id', appointmentId)
      .eq('staff_id', dietitianId)
      .limit(1)
  }

  const { data: consult, error: consultErr } = await query.maybeSingle()
  if (consultErr) {
    console.warn('[completeDietitianConsultation] Error querying consultation:', consultErr)
    return { completed: false, error: consultErr.message }
  }

  if (!consult || consult.is_completed) {
    return { completed: false, alreadyCompleted: Boolean(consult?.is_completed) }
  }

  // 1. Mark consultation as completed
  const { data: updatedConsult, error: updateErr } = await supabaseAdmin
    .from('staff_consultations')
    .update({
      status: 'completed',
      is_completed: true,
      completed_at: now,
      call_ended_at: consult.call_ended_at || now,
      meeting_status: 'ENDED',
      updated_at: now,
    })
    .eq('id', consult.id)
    .select()
    .maybeSingle()

  if (updateErr) {
    console.error('[completeDietitianConsultation] Failed to mark completed:', updateErr)
    return { completed: false, error: updateErr.message }
  }

  // 2. Credit the dietitian's wallet account using their configured payout_amount
  let walletResult = null
  try {
    walletResult = await creditCompletedConsultation({
      providerId: dietitianId,
      patientId,
      appointmentId: consult.id,
      appointmentType: consult.appointment_type || 'DIETITIAN_CONSULTATION',
      createdBy: dietitianId,
    })
  } catch (walletErr) {
    console.error('[completeDietitianConsultation] Wallet credit error:', walletErr)
  }

  // 3. Notify patient
  try {
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'appointment',
        title: 'Dietitian consultation completed',
        message: 'Your personalized clinical nutrition plan has been delivered and your consultation is concluded.',
        is_read: false,
      })
  } catch (notifErr) {
    console.warn('[completeDietitianConsultation] Notification error:', notifErr)
  }

  return {
    completed: true,
    consultation: updatedConsult,
    walletResult,
  }
}

