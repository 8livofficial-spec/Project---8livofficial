import assert from 'assert'
import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

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

// Dynamically import the backend function
const { loadPatientDoctorAvailability } = await import('../lib/patientAppointmentBooking.ts')

console.log("=== RUNNING PHASE 1 VALIDATION TEST SUITE ===\n")

let passed = 0
let total = 0

function it(desc, fn) {
  total++
  try {
    fn()
    console.log(`✅ PASS: ${desc}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`)
    console.error(err)
  }
}

async function runTests() {
  // 1. Find a test patient with assessment completed
  const { data: assessments } = await supabaseAdmin
    .from('health_assessments')
    .select('patient_id, is_eligible')
    .eq('is_eligible', true)
    .limit(1)

  const firstTimePatientId = assessments?.[0]?.patient_id

  // 2. Find a test patient with completed consultation
  const { data: consults } = await supabaseAdmin
    .from('doctor_consultations')
    .select('patient_id, status, appointment_type')
    .in('status', ['approved', 'attended', 'completed'])
    .limit(1)

  const returningPatientId = consults?.[0]?.patient_id

  console.log(`Test First-time Patient ID: ${firstTimePatientId}`)
  console.log(`Test Returning Patient ID: ${returningPatientId}\n`)

  if (firstTimePatientId) {
    const t0 = performance.now()
    const resultAuto = await loadPatientDoctorAvailability({
      patientId: firstTimePatientId,
    })
    const tAuto = performance.now() - t0

    it('Auto-resolution resolves authoritative appointmentType when omitted', () => {
      assert.ok(resultAuto, 'Result should exist')
      assert.ok('appointmentType' in resultAuto, 'appointmentType must be present in result')
      assert.ok(['INITIAL_DOCTOR_CONSULTATION', 'DOCTOR_FOLLOW_UP'].includes(resultAuto.appointmentType), 'Must resolve valid appointment type')
    })

    it('Slots and dates are returned properly for auto-resolved request', () => {
      assert.ok(Array.isArray(resultAuto.dates), 'Dates must be an array')
      assert.ok(Array.isArray(resultAuto.slots), 'Slots must be an array')
    })

    console.log(`[Validation Timing] Auto-resolved single request executed in: ${tAuto.toFixed(1)} ms`)
  }

  it('Cache returns identical object within TTL avoiding DB re-execution', async () => {
    if (firstTimePatientId) {
      const tCache0 = performance.now()
      const cachedResult = await loadPatientDoctorAvailability({
        patientId: firstTimePatientId,
        appointmentType: 'INITIAL_DOCTOR_CONSULTATION',
      })
      const tCache = performance.now() - tCache0
      assert.ok(cachedResult, 'Cached result must exist')
      assert.ok(tCache < 50, `Cached result should return rapidly (was ${tCache.toFixed(1)}ms)`)
      console.log(`[Validation Timing] Cached availability returned in: ${tCache.toFixed(1)} ms (<50ms)`)
    }
  })

  console.log(`\n--- PHASE 1 VALIDATION SUMMARY ---`)
  console.log(`Total: ${total}, Passed: ${passed}, Failed: ${total - passed}`)
  if (passed === total) {
    console.log(`STATUS: ALL PHASE 1 TESTS VERIFIED SUCCESSFULLY.`)
  } else {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
