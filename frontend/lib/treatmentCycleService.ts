import { supabaseAdmin } from './supabaseServer'
import { emitNotificationEvent } from './notificationDispatcher'

export type TreatmentCycleStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'UNDER_REVIEW'
  | 'PRESCRIBED'
  | 'FULFILLMENT'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED'

export type TreatmentCycle = {
  id: string
  subscription_id: string
  patient_id: string
  doctor_id?: string | null
  cycle_number: number
  start_date: string
  end_date: string
  status: TreatmentCycleStatus
  consultation_id?: string | null
  consultation_used: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function getPatientTreatmentCycles(patientId: string): Promise<TreatmentCycle[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('treatment_cycles')
      .select('*')
      .eq('patient_id', patientId)
      .order('cycle_number', { ascending: true })

    if (error) {
      console.warn('Unable to query treatment_cycles:', error.message)
      return []
    }

    return (data || []) as TreatmentCycle[]
  } catch (err) {
    console.error('Error fetching treatment cycles:', err)
    return []
  }
}

export async function getActiveTreatmentCycle(patientId: string): Promise<TreatmentCycle | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('treatment_cycles')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'ACTIVE')
      .order('cycle_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data as TreatmentCycle

    // If no cycle explicitly marked ACTIVE, pick lowest PENDING cycle
    const { data: nextPending } = await supabaseAdmin
      .from('treatment_cycles')
      .select('*')
      .eq('patient_id', patientId)
      .in('status', ['PENDING', 'UNDER_REVIEW', 'PRESCRIBED', 'FULFILLMENT'])
      .order('cycle_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    return (nextPending || null) as TreatmentCycle | null
  } catch (err) {
    console.error('Error in getActiveTreatmentCycle:', err)
    return null
  }
}

export async function recordCycleConsultationUsage(patientId: string, consultationId: string) {
  const activeCycle = await getActiveTreatmentCycle(patientId)
  if (!activeCycle) return null

  try {
    const { data, error } = await supabaseAdmin
      .from('treatment_cycles')
      .update({
        consultation_used: true,
        consultation_id: consultationId,
        status: 'UNDER_REVIEW',
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeCycle.id)
      .select('*')
      .maybeSingle()

    if (error) console.warn('Could not mark cycle consultation as used:', error.message)
    return data
  } catch (err) {
    console.error('Error updating cycle consultation usage:', err)
    return null
  }
}

export async function getPatientMedicationHistory(patientId: string) {
  try {
    const [prescriptionsRes, cyclesRes] = await Promise.all([
      supabaseAdmin
        .from('prescriptions')
        .select('*, prescription_items(*), pharmacy_orders(id, status, vendor, tracking_number, courier_name, estimated_delivery_at)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('treatment_cycles')
        .select('*')
        .eq('patient_id', patientId)
        .order('cycle_number', { ascending: true })
    ])

    const cyclesById = new Map((cyclesRes.data || []).map((c: any) => [c.id, c]))
    const prescriptions = prescriptionsRes.data || []

    return prescriptions.map((rx: any, idx: number) => {
      const linkedCycle = rx.treatment_cycle_id ? cyclesById.get(rx.treatment_cycle_id) : null
      const cycleNumber = linkedCycle?.cycle_number || idx + 1
      return {
        ...rx,
        cycle_number: cycleNumber,
        cycle_period: linkedCycle ? `${linkedCycle.start_date} to ${linkedCycle.end_date}` : null,
      }
    })
  } catch (err) {
    console.error('Error fetching medication history:', err)
    return []
  }
}

export async function requestPatientMedicationReview(params: {
  patientId: string
  notes: string
  doctorId?: string | null
}) {
  const activeCycle = await getActiveTreatmentCycle(params.patientId)

  const { data, error } = await supabaseAdmin
    .from('medication_review_requests')
    .insert({
      tenant_id: '8liv',
      patient_id: params.patientId,
      doctor_id: params.doctorId || null,
      treatment_cycle_id: activeCycle?.id || null,
      patient_notes: params.notes,
      status: 'REQUESTED',
    })
    .select('*')
    .single()

  if (error) throw error

  // Notify clinical team / doctor
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', params.patientId)
      .maybeSingle()

    const patientName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Patient'

    await supabaseAdmin.from('patient_notifications').insert({
      patient_id: params.patientId,
      type: 'clinical',
      title: 'Medication Review Requested',
      message: 'Your request for a clinical review of your treatment has been submitted to your doctor.',
      is_read: false,
    })

    if (params.doctorId) {
      const { data: doctorProfile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', params.doctorId)
        .maybeSingle()

      if (doctorProfile?.email) {
        await emitNotificationEvent({
          eventType: 'MEDICATION_REVIEW_REQUESTED',
          entityType: 'medication_review',
          entityId: data.id,
          recipientUserId: params.doctorId,
          recipientEmail: doctorProfile.email,
          recipientRole: 'doctor',
          subject: `Medication Review Request from ${patientName}`,
          messageContent: `Patient ${patientName} has requested a clinical medication review regarding their current treatment cycle. Please sign in to your doctor dashboard to review.`,
        })
      }
    }
  } catch (notifErr) {
    console.warn('Medication review notification warning:', notifErr)
  }

  return data
}
