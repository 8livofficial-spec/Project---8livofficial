import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { loadAssignedProviderPatients } from '@/lib/providerAssignedPatients'

const terminalStatuses = ['completed', 'cancelled', 'missed', 'MISSED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_PATIENT']

function canJoinSession(date?: string | null, time?: string | null, status?: string | null) {
  if (!date || !time || terminalStatuses.includes(String(status))) return false
  const start = new Date(`${date}T${String(time).slice(0, 5)}:00`)
  const now = new Date()
  const openAt = new Date(start.getTime() - 15 * 60 * 1000)
  const closeAt = new Date(start.getTime() + 90 * 60 * 1000)
  return now >= openAt && now <= closeAt
}

function formatRoleLabel(role: string) {
  if (role === 'dietitian') return 'Dietitian'
  if (role === 'nutritionist') return 'Nutritionist'
  if (role === 'fitness_coach') return 'Fitness Coach'
  return 'Provider'
}

// Helper functions for doctor consultations enrichment
function stringifyDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(stringifyDisplayValue).filter(Boolean).join(', ') || null;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const summaryParts = [
      record.eligibility_status ? `Status: ${stringifyDisplayValue(record.eligibility_status)}` : null,
      record.eligibility_reason ? `Reason: ${stringifyDisplayValue(record.eligibility_reason)}` : null,
      record.eligibility_message ? stringifyDisplayValue(record.eligibility_message) : null,
      record.bmi ? `BMI: ${stringifyDisplayValue(record.bmi)}` : null,
    ].filter(Boolean);
    if (summaryParts.length > 0) return summaryParts.join(' | ');
    return Object.entries(record)
      .map(([key, entry]) => {
        const text = stringifyDisplayValue(entry);
        return text ? `${key}: ${text}` : null;
      })
      .filter(Boolean)
      .join(' | ') || null;
  }
  return null;
}

function getEligibilityStatus(assessment: any): string {
  if (typeof assessment?.is_eligible === 'boolean') {
    return assessment.is_eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE';
  }
  if (assessment?.medical_history && typeof assessment.medical_history === 'object') {
    const status = assessment.medical_history.eligibility_status;
    const displayStatus = stringifyDisplayValue(status);
    if (displayStatus) return displayStatus;
  }
  return 'NOT_RECORDED';
}

function getRiskFlags(assessment: any): string | null {
  const medicalHistory = assessment?.medical_history;
  if (medicalHistory && typeof medicalHistory === 'object') {
    const record = medicalHistory as Record<string, unknown>;
    const flags = [
      stringifyDisplayValue(record.hard_rejections),
      stringifyDisplayValue(record.contraindications),
      stringifyDisplayValue(record.review_conditions),
      stringifyDisplayValue(record.comorbidities),
    ].filter(Boolean);
    if (flags.length > 0) return flags.join(' | ');
  }
  return [
    stringifyDisplayValue(assessment?.medical_history),
    stringifyDisplayValue(assessment?.extra_medical_info)
  ].filter(Boolean).join(' | ') || null;
}

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const userId = provider.user.id
  const role = provider.role

  try {
    if (role === 'doctor') {
      // 1. Fetch doctor's consultations and wallet in parallel
      const [consultationsRes, walletRes, availableRequestsRes] = await Promise.all([
        supabaseAdmin
          .from('doctor_consultations')
          .select('id, doctor_id, patient_id, booking_date, booking_time, status, room_url, is_completed, consultation_notes, prescription_type, created_at, call_started_at, call_ended_at, prescription_text, prescription_notes, updated_at, appointment_type, meeting_provider, meeting_room, meeting_url, completed_at')
          .eq('doctor_id', userId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('doctor_wallet')
          .select('*')
          .eq('doctor_id', userId)
          .maybeSingle(),
        // Get unclaimed requests (where status is scheduled and no doctor is assigned yet)
        supabaseAdmin
          .from('doctor_consultations')
          .select('id, doctor_id, patient_id, booking_date, booking_time, status, room_url, is_completed, consultation_notes, prescription_type, created_at, call_started_at, call_ended_at, prescription_text, prescription_notes, updated_at, appointment_type, meeting_provider, meeting_room, meeting_url, completed_at')
          .is('doctor_id', null)
          .in('status', ['scheduled', 'calling'])
          .order('created_at', { ascending: false })
      ])

      if (consultationsRes.error) throw consultationsRes.error

      const ownConsultations = consultationsRes.data || []
      const availableRequests = availableRequestsRes.data || []

      // Extract all patient IDs to enrich profiles
      const allPatientIds = Array.from(new Set([
        ...ownConsultations.map(c => c.patient_id),
        ...availableRequests.map(c => c.patient_id)
      ]))

      const [profilesRes, assessmentsRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, first_name, last_name, display_id, email, phone_number').in('id', allPatientIds),
        supabaseAdmin.from('health_assessments').select('patient_id, first_name, last_name, phone_number, dob_month, dob_day, dob_year, age, height_cm, weight_kg, goal_weight_kg, medical_history, extra_medical_info, local_food, workout_preference, is_eligible, medication_proof_url, medication_proof').in('patient_id', allPatientIds)
      ])

      const profiles = profilesRes.data || []
      const assessments = assessmentsRes.data || []

      const enrich = (c: any) => {
        const prof = (profiles.find((p: any) => p.id === c.patient_id) || { id: c.patient_id }) as any;
        const assess = (assessments.find((a: any) => a.patient_id === c.patient_id) || { patient_id: c.patient_id }) as any;
        const firstName = assess.first_name || prof.first_name || prof.display_id || 'Patient';
        const lastName = assess.last_name || prof.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          ...c,
          patient_name: fullName,
          patient_phone: assess.phone_number || prof.phone_number || 'No Phone',
          patient_email: prof.email || '',
          patient_gender: 'Unknown',
          patient_dob: assess.dob_month && assess.dob_day && assess.dob_year ? `${assess.dob_month} ${assess.dob_day}, ${assess.dob_year}` : 'Not Stated',
          patient_age: assess.age || null,
          patient_height: assess.height_cm || null,
          patient_weight: assess.weight_kg || null,
          patient_goal_weight: assess.goal_weight_kg || null,
          patient_bmi: assess.height_cm && assess.weight_kg
            ? Number((assess.weight_kg / Math.pow(assess.height_cm / 100, 2)).toFixed(1))
            : null,
          patient_history: stringifyDisplayValue(assess.medical_history),
          patient_extra_info: stringifyDisplayValue(assess.extra_medical_info),
          patient_local_food: assess.local_food || null,
          patient_workout_pref: assess.workout_preference || null,
          patient_eligibility_status: getEligibilityStatus(assess),
          patient_medical_risk_flags: getRiskFlags(assess),
          patient_medication_proof_url: assess.medication_proof_url || assess.medication_proof || null,
        }
      }

      return NextResponse.json({
        consultations: ownConsultations.map(enrich),
        availableRequests: availableRequests.map(enrich),
        wallet: walletRes.data || { balance: 0, pending_payout: 0, completed_payout: 0, doctor_id: userId }
      })
    }

    // Default provider logic (dietitians, nutritionists, fitness coaches)
    const [{ patients, summary }, consultationsRes, walletRes] = await Promise.all([
      loadAssignedProviderPatients(userId, role),
      supabaseAdmin
        .from('staff_consultations')
        .select('*')
        .eq('staff_id', userId)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true })
        .limit(8),
      supabaseAdmin
        .from('provider_wallets')
        .select('balance, pending_payout, completed_payout, lifetime_earnings')
        .eq('provider_id', userId)
        .maybeSingle(),
    ])

    if (consultationsRes.error) throw new Error(consultationsRes.error.message)

    const patientIds = Array.from(new Set((consultationsRes.data || []).map((row: any) => row.patient_id).filter(Boolean)))
    const profilesRes = patientIds.length
      ? await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', patientIds)
      : { data: [], error: null }

    if (profilesRes.error) throw new Error(profilesRes.error.message)

    const consultations = (consultationsRes.data || []).map((consultation: any) => {
      const profile = profilesRes.data?.find((row: any) => row.id === consultation.patient_id)
      const patientName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Patient'
      return {
        ...consultation,
        patientName,
        roleLabel: formatRoleLabel(role),
        canJoin: canJoinSession(consultation.booking_date, consultation.booking_time, consultation.status),
        meetingUrl: consultation.meeting_url,
      }
    })

    const stats = consultations.reduce((acc: Record<string, number>, consultation: any) => {
      const key = String(consultation.status || 'scheduled').toLowerCase()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      summary,
      patients: patients.slice(0, 4),
      consultations,
      stats,
      wallet: walletRes.data || { balance: 0, pending_payout: 0, completed_payout: 0, lifetime_earnings: 0 },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load provider dashboard.' }, { status: 500 })
  }
}
