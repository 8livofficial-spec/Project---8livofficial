import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function benchmark() {
  console.log("=== COMPARING AVAILABILITY METHODS ===")
  const testPatientId = '840752dd-be5d-4170-a3c3-327432d7f028'

  // --- METHOD A: Current Legacy Implementation ---
  const tA0 = performance.now()
  // 1. loadActiveDoctors (query 1 provider_profiles + query 2 profiles)
  const { data: profsA } = await sb.from('provider_profiles').select('provider_id, status').eq('role', 'doctor')
  const registeredIds = new Set(profsA?.map(p => p.provider_id))
  const activeIdsA = new Set(profsA?.filter(p => p.status === 'active').map(p => p.provider_id))
  const { data: legacyA } = await sb.from('profiles').select('id').eq('role', 'doctor')
  for (const r of legacyA || []) {
    if (!registeredIds.has(r.id)) activeIdsA.add(r.id)
  }
  const providerIdsA = Array.from(activeIdsA)

  // 2. provider_availability query
  const { data: rawSlotsA } = await sb.from('provider_availability')
    .select('id, provider_id, provider_role, available_date, start_time, end_time, slot_duration, source')
    .eq('provider_role', 'doctor')
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .in('provider_id', providerIdsA)
    .gte('available_date', new Date().toISOString().slice(0, 10))
    .limit(1000)

  // 3. Second loadActiveDoctors call
  const { data: profsA2 } = await sb.from('provider_profiles').select('provider_id, status').eq('role', 'doctor')
  const activeIdsA2 = new Set(profsA2?.filter(p => p.status === 'active').map(p => p.provider_id))
  const slotsA = (rawSlotsA || []).filter(s => activeIdsA2.has(s.provider_id))
  const tA = performance.now() - tA0
  console.log(`Method A (Current legacy 4 DB round-trips): ${tA.toFixed(1)} ms | Slots found: ${slotsA.length}`)

  // --- METHOD B: RPC-based Implementation ---
  const tB0 = performance.now()
  const { data: rpcDates, error: errDates } = await sb.rpc('get_available_appointment_dates', {
    p_provider_role: 'doctor',
    p_provider_id: null
  })
  let rpcSlots = []
  if (rpcDates && rpcDates.length > 0) {
    const { data: sData, error: errSlots } = await sb.rpc('get_available_appointment_slots', {
      p_provider_role: 'doctor',
      p_available_date: rpcDates[0].available_date,
      p_provider_id: null
    })
    rpcSlots = sData || []
  }
  const tB = performance.now() - tB0
  console.log(`Method B (PostgreSQL RPC get_available_appointment_dates + slots): ${tB.toFixed(1)} ms | Dates: ${rpcDates?.length}, First Date Slots: ${rpcSlots.length}`)

  // --- METHOD C: Consolidated Query with in-memory active doctor cache ---
  const tC0 = performance.now()
  // Active doctors query (1 fast indexed query)
  const { data: activeProfs } = await sb.from('provider_profiles').select('provider_id').eq('role', 'doctor').eq('status', 'active')
  const activeDocIds = (activeProfs || []).map(p => p.provider_id)
  
  // Directly query availability for active doctors
  const { data: slotsC } = await sb.from('provider_availability')
    .select('id, provider_id, provider_role, available_date, start_time, end_time, slot_duration, source')
    .eq('provider_role', 'doctor')
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .in('provider_id', activeDocIds)
    .gte('available_date', new Date().toISOString().slice(0, 10))
    .order('available_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1000)

  const tC = performance.now() - tC0
  console.log(`Method C (Consolidated 2 parallel queries, no double-fetching): ${tC.toFixed(1)} ms | Slots found: ${slotsC?.length}`)

  // Compare results equivalence:
  console.log("\n--- BEHAVIORAL EQUIVALENCE CHECK ---")
  console.log("Method A slots count:", slotsA.length)
  console.log("Method C slots count:", slotsC?.length)
  console.log("Do Method A and C return identical slot IDs?", JSON.stringify(slotsA.map(s => s.id).sort()) === JSON.stringify((slotsC || []).map(s => s.id).sort()))

  if (rpcDates && rpcDates.length > 0) {
    const firstDateA = rpcDates[0].available_date
    const slotsAFirstDate = slotsA.filter(s => s.available_date === firstDateA)
    console.log(`For first date ${firstDateA}:`)
    console.log(`- RPC slots count:`, rpcSlots.length)
    console.log(`- TypeScript slots count:`, slotsAFirstDate.length)
    const rpcIds = rpcSlots.map(s => s.slot_id).sort()
    const tsIds = slotsAFirstDate.map(s => s.id).sort()
    console.log(`- Exact Slot ID match?`, JSON.stringify(rpcIds) === JSON.stringify(tsIds))
  }
}

benchmark().catch(console.error)
