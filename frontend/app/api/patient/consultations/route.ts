import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { patientId, staffType, bookingDate, bookingTime } = body // staffType: 'dietitian' | 'trainer' | 'doctor'

    if (!patientId || !staffType || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Find the assigned staff ID from care_team_assignments
    const { data: assignment, error: assignmentErr } = await supabaseAdmin
      .from('care_team_assignments')
      .select('dietitian_id, trainer_id, doctor_id')
      .eq('patient_id', patientId)
      .single()

    if (assignmentErr || !assignment) {
      return NextResponse.json({ error: 'No care team assigned.' }, { status: 400 })
    }

    let targetDoctorId = null
    if (staffType === 'dietitian') targetDoctorId = assignment.dietitian_id
    else if (staffType === 'trainer') targetDoctorId = assignment.trainer_id
    else if (staffType === 'doctor') targetDoctorId = assignment.doctor_id

    if (!targetDoctorId) {
      return NextResponse.json({ error: `No ${staffType} assigned to this patient.` }, { status: 400 })
    }

    // 2. Create a real Daily.co room
    let roomUrl = `/patient/consultation/room?id=meeting_${Date.now()}`
    try {
      const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
        },
        body: JSON.stringify({
          name: `8liv-patient-${Date.now()}`,
          properties: {
            enable_chat: true,
            enable_knocking: true,
            exp: Math.round(Date.now() / 1000) + 7200,
            max_participants: 2
          }
        })
      })
      if (dailyRes.ok) {
        const room = await dailyRes.json()
        roomUrl = room.url
      }
    } catch (dailyErr) {
      console.error('Daily.co room creation failed, using fallback:', dailyErr)
    }

    // 3. Insert into doctor_consultations
    const { data: consultation, error: consultErr } = await supabaseAdmin
      .from('doctor_consultations')
      .insert({
        patient_id: patientId,
        doctor_id: targetDoctorId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'scheduled',
        room_url: roomUrl
      })
      .select()
      .single()

    if (consultErr) {
      console.error("Consultation insert error:", consultErr)
      return NextResponse.json({ error: consultErr.message }, { status: 500 })
    }

    // 3.5 Update health_assessments so Admin dashboard reflects Call Booked
    await supabaseAdmin
      .from('health_assessments')
      .update({
        booking_date: bookingDate,
        booking_time: bookingTime,
        room_url: roomUrl
      })
      .eq('patient_id', patientId)

    // 4. Create a notification for the patient
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'meeting',
        title: 'Meeting Scheduled',
        message: `Your video consultation with your ${staffType} has been scheduled for ${bookingDate} at ${bookingTime}.`,
        is_read: false
      })

    return NextResponse.json({ success: true, consultation })

  } catch (err: any) {
    console.error('API Error in /api/patient/consultations:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
