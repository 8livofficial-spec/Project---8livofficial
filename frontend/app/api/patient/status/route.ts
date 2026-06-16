import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

    // 1. Fetch Profile securely (bypassing RLS)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', patientId)
      .maybeSingle()

    // 2. Fetch Latest Assessment securely (bypassing RLS)
    const { data: assessments } = await supabaseAdmin
      .from('health_assessments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)

    const assessment = assessments && assessments.length > 0 ? assessments[0] : null

    // Auto-cleanup past scheduled consultations if time elapsed > 90 mins
    if (assessment && assessment.booking_date && assessment.booking_time) {
      try {
        const bookingDate = assessment.booking_date
        const bookingTime = assessment.booking_time

        // Parse booking date and time (e.g. "2026-06-15" and "10:00 AM")
        const timePart = bookingTime.trim()
        const isPM = timePart.toLowerCase().includes('pm')
        const [hourStr, minStr] = timePart.replace(/(am|pm)/i, '').trim().split(':')
        let hr = parseInt(hourStr)
        const mn = parseInt(minStr)
        if (isPM && hr < 12) hr += 12
        if (!isPM && hr === 12) hr = 0

        const apptDateTime = new Date(`${bookingDate}T${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}:00`)
        const now = new Date()

        // If more than 90 minutes have elapsed since the scheduled start time
        if (now.getTime() - apptDateTime.getTime() > 90 * 60 * 1000) {
          // Check doctor consultations first
          const { data: docConsult } = await supabaseAdmin
            .from('doctor_consultations')
            .select('*')
            .eq('patient_id', patientId)
            .eq('booking_date', bookingDate)
            .eq('booking_time', bookingTime)
            .in('status', ['scheduled', 'calling', 'attended'])
            .maybeSingle()

          if (docConsult) {
            const finalStatus = docConsult.status === 'attended' ? 'completed' : 'missed'
            await supabaseAdmin
              .from('doctor_consultations')
              .update({ status: finalStatus, is_completed: true })
              .eq('id', docConsult.id)

            // Clear booking in assessment
            await supabaseAdmin
              .from('health_assessments')
              .update({ booking_date: null, booking_time: null, room_url: null })
              .eq('patient_id', patientId)

            assessment.booking_date = null
            assessment.booking_time = null
            assessment.room_url = null
          } else {
            // Check staff consultations
            const { data: staffConsult } = await supabaseAdmin
              .from('staff_consultations')
              .select('*')
              .eq('patient_id', patientId)
              .eq('booking_date', bookingDate)
              .eq('booking_time', bookingTime)
              .in('status', ['scheduled', 'attended'])
              .maybeSingle()

            if (staffConsult) {
              const finalStatus = staffConsult.status === 'attended' ? 'completed' : 'missed'
              await supabaseAdmin
                .from('staff_consultations')
                .update({ status: finalStatus, is_completed: true })
                .eq('id', staffConsult.id)

              // Clear booking in assessment
              await supabaseAdmin
                .from('health_assessments')
                .update({ booking_date: null, booking_time: null, room_url: null })
                .eq('patient_id', patientId)

              assessment.booking_date = null
              assessment.booking_time = null
              assessment.room_url = null
            }
          }
        }
      } catch (checkErr) {
        console.error("Error in auto-cleanup of past bookings:", checkErr)
      }
    }

    // 3. Fetch Care Team Assignment and enrich with staff names
    const { data: assignment } = await supabaseAdmin
      .from('care_team_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle()

    let careTeam: any = {
      doctor_name: 'Not Assigned',
      dietitian_name: 'Not Assigned',
      trainer_name: 'Not Assigned',
      doctor_id: null,
      dietitian_id: null,
      trainer_id: null,
      dietitian_notes: null,
      trainer_notes: null
    }

    if (assignment) {
      careTeam.doctor_id = assignment.doctor_id || null
      careTeam.dietitian_id = assignment.dietitian_id || null
      careTeam.trainer_id = assignment.trainer_id || null

      const staffIds = [assignment.doctor_id, assignment.dietitian_id, assignment.trainer_id].filter(Boolean)
      
      if (staffIds.length > 0) {
        const { data: staffProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name, role')
          .in('id', staffIds)

        if (staffProfiles) {
          const doc = staffProfiles.find(s => s.id === assignment.doctor_id)
          const diet = staffProfiles.find(s => s.id === assignment.dietitian_id)
          const train = staffProfiles.find(s => s.id === assignment.trainer_id)

          if (doc) careTeam.doctor_name = `Dr. ${doc.first_name} ${doc.last_name}`.trim()
          if (diet) careTeam.dietitian_name = `${diet.first_name} ${diet.last_name}`.trim()
          if (train) careTeam.trainer_name = `${train.first_name} ${train.last_name}`.trim()
        }
      }
      careTeam.dietitian_notes = assignment.dietitian_notes
      careTeam.trainer_notes = assignment.trainer_notes
    }

    // 4. Fetch staff consultations (trainer/dietitian sessions)
    const { data: staffConsults } = await supabaseAdmin
      .from('staff_consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    return NextResponse.json({ profile, assessment, careTeam, staffConsultations: staffConsults || [] })
  } catch (err: any) {
    console.error("API Error in /api/patient/status:", err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
