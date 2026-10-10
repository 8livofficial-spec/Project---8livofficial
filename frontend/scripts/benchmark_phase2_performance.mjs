import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve('.env.local') })

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const {
  loadPatientDoctorAvailability,
  invalidateDoctorAvailabilityCache
} = await import('../lib/patientAppointmentBooking.ts')

function computePercentiles(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.50)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length
  return { p50, p95, avg }
}

async function runBenchmark() {
  console.log("=== PHASE 2 COMPREHENSIVE PERFORMANCE BENCHMARK ===\n")

  const { data: firstTimeAss } = await supabaseAdmin
    .from('health_assessments')
    .select('patient_id, is_eligible')
    .eq('is_eligible', true)
    .limit(1)
  const newPatientId = firstTimeAss?.[0]?.patient_id

  const { data: consults } = await supabaseAdmin
    .from('doctor_consultations')
    .select('patient_id, status, appointment_type')
    .in('status', ['approved', 'attended', 'completed'])
    .limit(1)
  const returningPatientId = consults?.[0]?.patient_id

  console.log(`New Patient ID: ${newPatientId}`)
  console.log(`Returning Patient ID: ${returningPatientId}\n`)

  // 1. Cold Cache: New Patient
  invalidateDoctorAvailabilityCache()
  const tColdNew0 = performance.now()
  const resColdNew = await loadPatientDoctorAvailability({
    patientId: newPatientId,
    appointmentType: 'INITIAL_DOCTOR_CONSULTATION',
  })
  const tColdNew = performance.now() - tColdNew0
  console.log(`[Cold Cache] New Patient Availability: ${tColdNew.toFixed(1)} ms | Slots found: ${resColdNew.slots?.length || 0}`)

  // 2. Warm Cache: New Patient
  const tWarmNew0 = performance.now()
  const resWarmNew = await loadPatientDoctorAvailability({
    patientId: newPatientId,
    appointmentType: 'INITIAL_DOCTOR_CONSULTATION',
  })
  const tWarmNew = performance.now() - tWarmNew0
  console.log(`[Warm Cache] New Patient Availability: ${tWarmNew.toFixed(2)} ms | Slots found: ${resWarmNew.slots?.length || 0}`)

  // 3. Cold Cache: Returning Patient
  invalidateDoctorAvailabilityCache()
  const tColdRet0 = performance.now()
  const resColdRet = await loadPatientDoctorAvailability({
    patientId: returningPatientId,
    appointmentType: 'DOCTOR_FOLLOW_UP',
  })
  const tColdRet = performance.now() - tColdRet0
  console.log(`[Cold Cache] Returning Patient Availability: ${tColdRet.toFixed(1)} ms | Slots found: ${resColdRet.slots?.length || 0}`)

  // 4. Warm Cache: Returning Patient
  const tWarmRet0 = performance.now()
  const resWarmRet = await loadPatientDoctorAvailability({
    patientId: returningPatientId,
    appointmentType: 'DOCTOR_FOLLOW_UP',
  })
  const tWarmRet = performance.now() - tWarmRet0
  console.log(`[Warm Cache] Returning Patient Availability: ${tWarmRet.toFixed(2)} ms | Slots found: ${resWarmRet.slots?.length || 0}`)

  // 5. Date-specific slot request (Carousel date clicking) via Stored Procedure RPC
  invalidateDoctorAvailabilityCache()
  const tDateRpc0 = performance.now()
  const resDateRpc = await loadPatientDoctorAvailability({
    patientId: newPatientId,
    appointmentType: 'INITIAL_DOCTOR_CONSULTATION',
    date: resColdNew.dates?.[0]?.date || '2026-10-12',
  })
  const tDateRpc = performance.now() - tDateRpc0
  console.log(`[Specific Date RPC] Selected Date Slots: ${tDateRpc.toFixed(1)} ms | Slots on date: ${resDateRpc.slots?.length || 0}`)

  // 6. Concurrency & Percentiles across 15 iterations (Cold + Warm mix)
  console.log("\n--- SIMULATING 15 REPEATED CALLS FOR P50 / P95 MEASUREMENTS ---")
  const latencies = []
  for (let i = 0; i < 15; i++) {
    if (i % 5 === 0) invalidateDoctorAvailabilityCache() // mix cold cache every 5 calls
    const t0 = performance.now()
    await loadPatientDoctorAvailability({
      patientId: i % 2 === 0 ? newPatientId : returningPatientId,
      appointmentType: i % 2 === 0 ? 'INITIAL_DOCTOR_CONSULTATION' : 'DOCTOR_FOLLOW_UP',
    })
    latencies.push(performance.now() - t0)
  }
  const stats = computePercentiles(latencies)
  console.log(`P50 Latency: ${stats.p50.toFixed(1)} ms`)
  console.log(`P95 Latency: ${stats.p95.toFixed(1)} ms`)
  console.log(`Average Latency: ${stats.avg.toFixed(1)} ms`)

  // 7. Concurrent Users (5 parallel requests)
  console.log("\n--- SIMULATING 5 CONCURRENT PATIENTS ---")
  invalidateDoctorAvailabilityCache()
  const tConc0 = performance.now()
  await Promise.all([
    loadPatientDoctorAvailability({ patientId: newPatientId, appointmentType: 'INITIAL_DOCTOR_CONSULTATION' }),
    loadPatientDoctorAvailability({ patientId: returningPatientId, appointmentType: 'DOCTOR_FOLLOW_UP' }),
    loadPatientDoctorAvailability({ patientId: newPatientId, appointmentType: 'INITIAL_DOCTOR_CONSULTATION', date: '2026-10-12' }),
    loadPatientDoctorAvailability({ patientId: returningPatientId, appointmentType: 'DOCTOR_FOLLOW_UP', date: '2026-10-12' }),
    loadPatientDoctorAvailability({ patientId: newPatientId, appointmentType: 'INITIAL_DOCTOR_CONSULTATION' }),
  ])
  const tConc = performance.now() - tConc0
  console.log(`5 Concurrent Requests Completed In: ${tConc.toFixed(1)} ms total`)
}

runBenchmark().catch(console.error)
