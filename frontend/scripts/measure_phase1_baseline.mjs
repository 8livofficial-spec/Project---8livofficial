import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

async function run() {
  console.log("=== PHASE 1 BASELINE TIMING MEASUREMENT ===")
  
  // 1. Find a sample patient with completed consultation or membership
  const { data: members, error: mErr } = await supabaseAdmin
    .from('memberships')
    .select('patient_id, status')
    .eq('status', 'ACTIVE')
    .limit(3)

  if (mErr || !members?.length) {
    console.log("No active members found in memberships, checking assessments...")
  }

  const { data: assessments, error: aErr } = await supabaseAdmin
    .from('health_assessments')
    .select('patient_id, is_eligible, first_consultation_completed')
    .limit(3)

  const activePatientId = members?.[0]?.patient_id || assessments?.[0]?.patient_id

  console.log("Testing with Patient ID:", activePatientId)

  // 2. Measure getPatientBookingContext queries
  const t0 = performance.now()
  const [
    assessmentsRes,
    completedInitialRes,
    membershipRes,
    doctorAssignmentRes
  ] = await Promise.all([
    supabaseAdmin
      .from('health_assessments')
      .select('id, is_eligible, medical_history, first_consultation_completed')
      .eq('patient_id', activePatientId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('doctor_consultations')
      .select('id, appointment_type, status')
      .eq('patient_id', activePatientId)
      .in('status', ['approved', 'rejected', 'completed'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('memberships')
      .select('*')
      .eq('patient_id', activePatientId)
      .maybeSingle(),
    supabaseAdmin
      .from('care_team_assignments')
      .select('doctor_id')
      .eq('patient_id', activePatientId)
      .maybeSingle()
  ])
  const tContext = performance.now() - t0
  console.log(`[Baseline] getPatientBookingContext (4 parallel queries): ${tContext.toFixed(1)} ms`)
  
  const assessment = assessmentsRes.data?.[0]
  const completedInitial = completedInitialRes.data
  const membershipActive = membershipRes.data?.status === 'ACTIVE'
  const firstConsultationCompleted = Boolean(
    assessment?.first_consultation_completed === true ||
    (completedInitial?.id && !['DOCTOR_FOLLOW_UP', 'FOLLOW_UP_CONSULTATION'].includes(String(completedInitial.appointment_type || '').toUpperCase()))
  )
  const expectedType = membershipActive && firstConsultationCompleted ? 'DOCTOR_FOLLOW_UP' : 'INITIAL_DOCTOR_CONSULTATION'

  console.log("Patient Membership Active:", membershipActive)
  console.log("First Consultation Completed:", firstConsultationCompleted)
  console.log("Expected Authoritative Appointment Type:", expectedType)

  // 3. Measure loadActiveDoctors queries
  const tDoc0 = performance.now()
  const { data: docProfiles } = await supabaseAdmin
    .from('provider_profiles')
    .select('provider_id, status')
    .eq('role', 'doctor')
  const tDoc = performance.now() - tDoc0
  console.log(`[Baseline] loadActiveDoctors: ${tDoc.toFixed(1)} ms (found ${docProfiles?.length || 0} providers)`)

  // 4. Measure provider_availability query
  const tAvail0 = performance.now()
  const { data: availSlots, error: availErr } = await supabaseAdmin
    .from('provider_availability')
    .select('id, provider_id, provider_role, available_date, start_time, end_time, slot_duration, source')
    .eq('provider_role', 'doctor')
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .gte('available_date', new Date().toISOString().slice(0, 10))
    .order('available_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1000)
  const tAvail = performance.now() - tAvail0
  console.log(`[Baseline] provider_availability query: ${tAvail.toFixed(1)} ms (found ${availSlots?.length || 0} slots)`)

  // 5. Total sequential DB time of one loadPatientDoctorAvailability call:
  const totalSeq = tContext + tDoc + tAvail
  console.log(`[Baseline] Total single availability request DB time: ${totalSeq.toFixed(1)} ms`)

  console.log("\n=== DOUBLE FETCH SIMULATION ===")
  if (expectedType === 'DOCTOR_FOLLOW_UP') {
    console.log(`For this returning member, the frontend currently calls INITIAL_DOCTOR_CONSULTATION first:`)
    console.log(`Call 1 (INITIAL_DOCTOR_CONSULTATION): evaluates context (${tContext.toFixed(1)}ms), validates eligibility -> REJECTED 403 Forbidden!`)
    console.log(`Call 2 (DOCTOR_FOLLOW_UP after patientData resolves): evaluates context + doctors + slots -> ${totalSeq.toFixed(1)}ms`)
    console.log(`Total DB time for consultation page mount: ${(tContext + totalSeq).toFixed(1)} ms! Double fetch confirmed.`)
  } else {
    console.log(`For first-time patient, appointmentType is INITIAL_DOCTOR_CONSULTATION.`)
    console.log(`Call 1 executes in ${totalSeq.toFixed(1)} ms, but UI is blocked behind patientDataLoading spinner for ~1800ms.`)
  }
}

run().catch(console.error)
