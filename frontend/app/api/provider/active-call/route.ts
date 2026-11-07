import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const provider = await getAuthenticatedProvider(request)
    if ('error' in provider) {
      return NextResponse.json({ hasActiveCall: false, error: provider.error }, { status: provider.status })
    }

    const userId = provider.user.id
    const role = provider.role

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

    // Helper to test if booking time is within active join window
    const isTimeActive = (bookingDate: string, bookingTime: string) => {
      if (!bookingDate || !bookingTime) return false
      try {
        let isoDate = bookingDate
        if (bookingDate.includes('/')) {
          const [d, m, y] = bookingDate.split('/')
          isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        }
        // Match today in IST
        if (isoDate !== todayStr) return false

        let timeStr = bookingTime
        if (timeStr.length === 5) timeStr += ':00'
        const target = new Date(`${isoDate}T${timeStr}+05:30`)
        const start = target.getTime()
        const current = Date.now()
        const TWENTY_MIN = 20 * 60 * 1000
        const ONE_AND_HALF_HOURS = 90 * 60 * 1000
        return current >= start - TWENTY_MIN && current <= start + ONE_AND_HALF_HOURS
      } catch {
        return false
      }
    }

    if (role === 'doctor') {
      const { data: rows, error } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id, doctor_id, patient_id, booking_date, booking_time, status, meeting_url, meeting_status, is_completed, appointment_type')
        .eq('doctor_id', userId)
        .eq('is_completed', false)
        .in('status', ['calling', 'in_progress', 'scheduled', 'booked', 'confirmed', 'attended'])
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .limit(10)

      if (error || !rows || rows.length === 0) {
        return NextResponse.json({ hasActiveCall: false })
      }

      // Priority 1: status is 'calling' or 'in_progress' or meeting_status is active
      // Priority 2: today and within join window
      const activeRow = rows.find(r =>
        ['calling', 'in_progress'].includes(String(r.status || '').toLowerCase()) ||
        ['IN_PROGRESS', 'CALLING', 'ACTIVE'].includes(String(r.meeting_status || '').toUpperCase())
      ) || rows.find(r => isTimeActive(r.booking_date, r.booking_time))

      if (!activeRow) {
        return NextResponse.json({ hasActiveCall: false })
      }

      let patientName = 'Patient'
      if (activeRow.patient_id) {
        const { data: pProfile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email, phone')
          .eq('id', activeRow.patient_id)
          .maybeSingle()
        if (pProfile) {
          patientName = [pProfile.first_name, pProfile.last_name].filter(Boolean).join(' ') || pProfile.phone || pProfile.email || 'Patient'
        }
      }

      return NextResponse.json({
        hasActiveCall: true,
        consultation: {
          id: activeRow.id,
          patientName,
          patientId: activeRow.patient_id,
          bookingDate: activeRow.booking_date,
          bookingTime: activeRow.booking_time,
          status: activeRow.status,
          meetingStatus: activeRow.meeting_status,
          meetingUrl: activeRow.meeting_url || `/video/room?id=${activeRow.id}`,
          providerRole: 'doctor',
          appointmentType: activeRow.appointment_type || 'Doctor Consultation'
        }
      })
    } else {
      // Staff consultation (dietitian, fitness_coach, nutritionist, trainer)
      const { data: rows, error } = await supabaseAdmin
        .from('staff_consultations')
        .select('id, staff_id, staff_role, patient_id, booking_date, booking_time, status, meeting_url, meeting_status, is_completed')
        .eq('staff_id', userId)
        .eq('is_completed', false)
        .in('status', ['calling', 'in_progress', 'scheduled', 'booked', 'confirmed', 'attended'])
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .limit(10)

      if (error || !rows || rows.length === 0) {
        return NextResponse.json({ hasActiveCall: false })
      }

      const activeRow = rows.find(r =>
        ['calling', 'in_progress'].includes(String(r.status || '').toLowerCase()) ||
        ['IN_PROGRESS', 'CALLING', 'ACTIVE'].includes(String(r.meeting_status || '').toUpperCase())
      ) || rows.find(r => isTimeActive(r.booking_date, r.booking_time))

      if (!activeRow) {
        return NextResponse.json({ hasActiveCall: false })
      }

      let patientName = 'Patient'
      if (activeRow.patient_id) {
        const { data: pProfile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email, phone')
          .eq('id', activeRow.patient_id)
          .maybeSingle()
        if (pProfile) {
          patientName = [pProfile.first_name, pProfile.last_name].filter(Boolean).join(' ') || pProfile.phone || pProfile.email || 'Patient'
        }
      }

      return NextResponse.json({
        hasActiveCall: true,
        consultation: {
          id: activeRow.id,
          patientName,
          patientId: activeRow.patient_id,
          bookingDate: activeRow.booking_date,
          bookingTime: activeRow.booking_time,
          status: activeRow.status,
          meetingStatus: activeRow.meeting_status,
          meetingUrl: activeRow.meeting_url || `/video/room?id=${activeRow.id}`,
          providerRole: role,
          appointmentType: activeRow.staff_role ? `${activeRow.staff_role.replace('_', ' ')} Consultation` : 'Consultation'
        }
      })
    }
  } catch (err: any) {
    return NextResponse.json({ hasActiveCall: false, error: err.message }, { status: 500 })
  }
}

