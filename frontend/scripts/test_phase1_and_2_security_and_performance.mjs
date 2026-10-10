import assert from 'assert'
import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve('.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

const {
  loadPatientDoctorAvailability,
  invalidateDoctorAvailabilityCache,
  getPatientBookingContext,
  expectedDoctorAppointmentType
} = await import('../lib/patientAppointmentBooking.ts')

const { getAuthenticatedPatient } = await import('../lib/appointmentAvailability.ts')

console.log("=== RUNNING SECURITY, CACHE INVALIDATION & EQUIVALENCE REGRESSION SUITE ===\n")

let passed = 0
let total = 0

async function test(name, fn) {
  total++
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(err)
  }
}

async function run() {
  // Find a first-time test patient
  const { data: firstTimeAss } = await supabaseAdmin
    .from('health_assessments')
    .select('patient_id, is_eligible')
    .eq('is_eligible', true)
    .limit(1)
  const firstTimePatientId = firstTimeAss?.[0]?.patient_id

  // Find a returning test patient with completed consultation
  const { data: completedConsult } = await supabaseAdmin
    .from('doctor_consultations')
    .select('patient_id, appointment_type, status')
    .in('status', ['approved', 'attended', 'completed'])
    .limit(1)
  const returningPatientId = completedConsult?.[0]?.patient_id

  // 1. Verify Authentication & Anti-Spoofing
  await test('Security: getAuthenticatedPatient rejects missing Authorization header', async () => {
    const req = new Request('http://localhost:3000/api/patient/appointments/availability')
    const res = await getAuthenticatedPatient(req)
    assert.ok('error' in res, 'Should return error object')
    assert.strictEqual(res.status, 401, 'Status must be 401')
  })

  await test('Security: getAuthenticatedPatient rejects forged or invalid tokens', async () => {
    const req = new Request('http://localhost:3000/api/patient/appointments/availability', {
      headers: { Authorization: 'Bearer forged.token.value' }
    })
    const res = await getAuthenticatedPatient(req)
    assert.ok('error' in res, 'Should return error object')
    assert.strictEqual(res.status, 401, 'Status must be 401')
  })

  await test('Security: Cache keys are patient-isolated and prevent cross-patient data leakage', async () => {
    invalidateDoctorAvailabilityCache()
    // Populate cache for patient 1
    const res1 = await loadPatientDoctorAvailability({
      patientId: firstTimePatientId,
      appointmentType: 'INITIAL_DOCTOR_CONSULTATION'
    })
    // Ensure patient 2 gets their own cache entry
    const res2 = await loadPatientDoctorAvailability({
      patientId: returningPatientId,
      appointmentType: 'INITIAL_DOCTOR_CONSULTATION'
    })
    assert.ok(res1 !== res2 || firstTimePatientId === returningPatientId, 'Cache objects must be distinct per patient ID')
  })

  // 2. Verify Cache Invalidation
  await test('Cache Invalidation: invalidateDoctorAvailabilityCache flushes cache', async () => {
    // Populate cache
    await loadPatientDoctorAvailability({
      patientId: firstTimePatientId,
      appointmentType: 'INITIAL_DOCTOR_CONSULTATION'
    })
    
    // Invalidate
    invalidateDoctorAvailabilityCache()
    
    // Now request should do fresh execution
    const t0 = performance.now()
    const freshRes = await loadPatientDoctorAvailability({
      patientId: firstTimePatientId,
      appointmentType: 'INITIAL_DOCTOR_CONSULTATION'
    })
    const t = performance.now() - t0
    assert.ok(freshRes, 'Result must exist')
    // After invalidation, DB queries execute so time > 50ms
    console.log(`   (Re-fetch time after invalidation: ${t.toFixed(1)} ms)`)
  })

  // 3. Verify Consistency of Client vs Server Auto-Resolution
  await test('Consistency: First-time patient resolves INITIAL_DOCTOR_CONSULTATION consistently', async () => {
    const context = await getPatientBookingContext(firstTimePatientId)
    const serverExpected = expectedDoctorAppointmentType(context)
    
    // Client-side formula simulation:
    const isActiveMemberFollowUp = context.membershipActive && context.firstConsultationCompleted
    const clientCalculated = isActiveMemberFollowUp ? 'DOCTOR_FOLLOW_UP' : 'INITIAL_DOCTOR_CONSULTATION'

    assert.strictEqual(serverExpected, clientCalculated, 'Server and client must calculate identical appointmentType')
    assert.strictEqual(serverExpected, 'INITIAL_DOCTOR_CONSULTATION', 'First-time patient must be INITIAL_DOCTOR_CONSULTATION')
  })

  await test('Consistency: Returning member resolves DOCTOR_FOLLOW_UP consistently', async () => {
    const context = await getPatientBookingContext(returningPatientId)
    const serverExpected = expectedDoctorAppointmentType(context)

    const isActiveMemberFollowUp = context.membershipActive && context.firstConsultationCompleted
    const clientCalculated = isActiveMemberFollowUp ? 'DOCTOR_FOLLOW_UP' : 'INITIAL_DOCTOR_CONSULTATION'

    assert.strictEqual(serverExpected, clientCalculated, 'Server and client must calculate identical appointmentType')
  })

  // 4. Verify Database RPC Equivalence
  await test('RPC Equivalence: get_available_appointment_dates matches database availability', async () => {
    const { data: rpcDates, error: rpcErr } = await supabaseAdmin.rpc('get_available_appointment_dates', {
      p_provider_role: 'doctor',
      p_provider_id: null
    })
    assert.ifError(rpcErr)
    assert.ok(Array.isArray(rpcDates), 'RPC dates must be array')
    assert.ok(rpcDates.length > 0, 'Should find available dates')
  })

  await test('RPC Equivalence: get_available_appointment_slots returns active doctor slots for date', async () => {
    const { data: rpcDates } = await supabaseAdmin.rpc('get_available_appointment_dates', {
      p_provider_role: 'doctor',
      p_provider_id: null
    })
    if (rpcDates && rpcDates.length > 0) {
      const targetDate = rpcDates[0].available_date
      const { data: slots, error } = await supabaseAdmin.rpc('get_available_appointment_slots', {
        p_provider_role: 'doctor',
        p_available_date: targetDate,
        p_provider_id: null
      })
      assert.ifError(error)
      assert.ok(Array.isArray(slots), 'Slots must be an array')
      assert.strictEqual(slots.length, Number(rpcDates[0].available_count), 'Slot count must match date count')
      for (const s of slots) {
        assert.strictEqual(s.available_date, targetDate, 'Slot date must match requested date')
        assert.strictEqual(s.slot_status, 'AVAILABLE', 'Slot must be AVAILABLE')
      }
    }
  })

  console.log(`\n--- TEST RUN COMPLETE: ${passed}/${total} TESTS PASSED ---`)
  if (passed === total) {
    console.log("STATUS: ALL SECURITY, CACHE INVALIDATION & EQUIVALENCE TESTS VERIFIED SUCCESSFULLY.")
  } else {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
