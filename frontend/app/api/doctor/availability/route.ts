import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

type GeneratedSlot = {
  available_date: string
  time_slot: string
  end_time?: string
  slot_duration?: number
  source?: string
}

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Internal Server Error'

function normalizeTime(value: string) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return ''
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}:00`
}

function minutesFromTime(time: string) {
  const match = String(time || '').trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

function timeFromMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function timesOverlap(firstStart: string, firstEnd: string, secondStart: string, secondEnd: string) {
  return normalizeTime(firstStart) < normalizeTime(secondEnd) && normalizeTime(firstEnd) > normalizeTime(secondStart)
}


export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { doctorId, email, slots } = body as {
      doctorId?: string
      email?: string
      slots?: GeneratedSlot[]
    }

    if (!doctorId) {
      return NextResponse.json({ error: 'Missing doctorId.' }, { status: 400 })
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: 'No availability slots were provided.' }, { status: 400 })
    }

    const cleanedSlots = slots
      .filter(slot => slot?.available_date && slot?.time_slot)
      .map(slot => ({
        available_date: slot.available_date,
        time_slot: slot.time_slot,
        end_time: slot.end_time || null,
        slot_duration: Number(slot.slot_duration || 30),
        source: slot.source || 'MANUAL'
      }))

    if (cleanedSlots.length === 0) {
      return NextResponse.json({ error: 'No valid availability slots were provided.' }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: doctorId,
        role: 'doctor',
        first_name: 'Dr',
        last_name: email || 'Doctor',
        email: email || null,
      })

    if (profileError) {
      return NextResponse.json({ error: `Doctor profile setup failed: ${profileError.message}` }, { status: 500 })
    }

    const { error: doctorProfileError } = await supabaseAdmin
      .from('doctor_profiles')
      .upsert({
        id: doctorId,
        full_name: email ? `Dr. ${email.split('@')[0]}` : 'Dr. Doctor',
        specialty: 'Endocrinologist',
      })

    if (doctorProfileError) {
      return NextResponse.json({ error: `Doctor specialist profile setup failed: ${doctorProfileError.message}` }, { status: 500 })
    }

    const { error: providerProfileError } = await supabaseAdmin
      .from('provider_profiles')
      .upsert({
        provider_id: doctorId,
        role: 'doctor',
        full_name: email ? `Dr. ${email.split('@')[0]}` : 'Dr. Doctor',
        email: email || null,
        status: 'active',
        payout_amount: 500,
      })

    if (providerProfileError) {
      return NextResponse.json({ error: `Provider profile setup failed: ${providerProfileError.message}` }, { status: 500 })
    }

    const dates = Array.from(new Set(cleanedSlots.map(slot => slot.available_date)))
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('provider_availability')
      .select('id, available_date, start_time, end_time, status')
      .eq('provider_id', doctorId)
      .eq('provider_role', 'doctor')
      .in('available_date', dates)

    if (existingError) {
      return NextResponse.json({ error: `Existing slot lookup failed: ${existingError.message}` }, { status: 500 })
    }

    const cleaned = cleanedSlots.map(slot => {
      const startMin = minutesFromTime(slot.time_slot)
      const slotDur = Number(slot.slot_duration || 30)
      const computedEnd = slot.end_time || timeFromMinutes(startMin + slotDur)
      return {
        available_date: slot.available_date,
        start_time: normalizeTime(slot.time_slot),
        end_time: normalizeTime(computedEnd),
        slot_duration: slotDur,
        source: slot.source === 'MANUAL' ? 'MANUAL' : 'GENERATED',
      }
    })

    const accepted: typeof cleaned = []
    for (const slot of cleaned) {
      if (accepted.some(item => item.available_date === slot.available_date && timesOverlap(item.start_time, item.end_time, slot.start_time, slot.end_time))) {
        continue
      }
      accepted.push(slot)
    }

    const activeStatuses = ['AVAILABLE', 'BOOKED']
    const existingSlots = (existing || [])
    const activeExisting = existingSlots.filter(s => activeStatuses.includes(String(s.status || '')))
    const reusable = new Map(existingSlots.filter(s => ['CANCELLED', 'EXPIRED'].includes(String(s.status || ''))).map(s => [`${s.available_date}-${normalizeTime(s.start_time)}`, s]))

    const reactivations: Array<{ id: string; end_time: string; slot_duration: number }> = []
    const inserts: typeof accepted = []

    for (const slot of accepted) {
      if (activeExisting.some(item => item.available_date === slot.available_date && timesOverlap(item.start_time, item.end_time, slot.start_time, slot.end_time))) {
        continue
      }
      const previous = reusable.get(`${slot.available_date}-${slot.start_time}`)
      if (previous) {
        reactivations.push({ id: previous.id, end_time: slot.end_time, slot_duration: slot.slot_duration })
      } else {
        inserts.push(slot)
      }
    }

    if (reactivations.length > 0) {
      const reactivationResults = await Promise.all(reactivations.map(item => supabaseAdmin
        .from('provider_availability')
        .update({
          end_time: item.end_time,
          slot_duration: item.slot_duration,
          status: 'AVAILABLE',
          is_available: true,
          break_start: null,
          break_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
      ))
      const reactivationError = reactivationResults.find(result => result.error)?.error
      if (reactivationError) {
        return NextResponse.json({ error: `Failed to reactivate slot: ${reactivationError.message}` }, { status: 500 })
      }
    }

    const rows = inserts.map(slot => ({
      provider_id: doctorId,
      provider_role: 'doctor',
      available_date: slot.available_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      slot_duration: slot.slot_duration,
      source: slot.source,
      status: 'AVAILABLE',
      is_available: true,
      break_start: null,
      break_end: null,
    }))

    const insertResult = rows.length ? await supabaseAdmin.from('provider_availability').insert(rows) : { error: null }
    if (insertResult.error) {
      const conflict = insertResult.error.code === '23505' || insertResult.error.code === '23P01'
      return NextResponse.json({ error: conflict ? 'One or more slots overlap existing availability for this provider.' : insertResult.error.message }, { status: conflict ? 409 : 500 })
    }

    const savedCount = inserts.length + reactivations.length
    const skippedCount = cleanedSlots.length - savedCount
    let msg = `Generated ${savedCount} new availability slots.`
    if (skippedCount > 0) {
      msg = `Generated ${savedCount} new availability slots. ${skippedCount} slot(s) were skipped because they overlap with existing scheduled or booked times.`
    }
    return NextResponse.json({
      success: true,
      inserted: savedCount,
      skipped: skippedCount,
      message: msg,
    })


  } catch (err: unknown) {
    console.error('API Error in /api/doctor/availability:', err)
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
