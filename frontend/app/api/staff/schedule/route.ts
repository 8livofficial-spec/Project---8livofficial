import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { staffId, role, patientId, bookingDate, bookingTime, consultationNotes } = body

    if (!staffId || !role || !patientId || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create a real Daily.co room
    let roomUrl = `/patient/consultation/room?id=meeting_${Date.now()}`
    try {
      const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
        },
        body: JSON.stringify({
          name: `8liv-${role}-${Date.now()}`,
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

    // 1. Insert into staff_consultations
    const { data: consultation, error: consultErr } = await supabaseAdmin
      .from('staff_consultations')
      .insert({
        staff_id: staffId,
        staff_role: role,
        patient_id: patientId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'scheduled',
        room_url: roomUrl,
        consultation_notes: consultationNotes || null
      })
      .select()
      .single()

    if (consultErr) {
      console.error('Failed to create staff consultation:', consultErr)
      return NextResponse.json({ error: consultErr.message }, { status: 500 })
    }

    // 1.5 Update health_assessments so Admin dashboard reflects Call Booked
    await supabaseAdmin
      .from('health_assessments')
      .update({
        booking_date: bookingDate,
        booking_time: bookingTime,
        room_url: roomUrl
      })
      .eq('patient_id', patientId)

    // 2. Insert notification for the patient
    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1)
    const { error: notifErr } = await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'appointment',
        title: 'New 1:1 Session Scheduled',
        message: `Your ${roleCapitalized} has scheduled a 1:1 session with you on ${bookingDate} at ${bookingTime}.`,
        is_read: false
      })

    if (notifErr) {
      console.error('Failed to create notification for staff meeting:', notifErr.message)
    }

    // 3. Send email via Resend
    // First, fetch patient's email from Auth Admin
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(patientId)
    
    if (userError || !userData?.user?.email) {
      console.error('Failed to fetch patient email for reminder:', userError?.message)
    } else {
      const patientEmail = userData.user.email;
      
      const { error: resendError } = await resend.emails.send({
        from: '8Liv Medical Team <onboarding@resend.dev>', // You should verify a custom domain in Resend for production
        to: [patientEmail],
        subject: `Upcoming 1:1 Session with your ${roleCapitalized}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #0f172a; text-align: center;">8Liv Session Reminder</h2>
            <p style="color: #475569; font-size: 16px;">Hello,</p>
            <p style="color: #475569; font-size: 16px;">Your ${roleCapitalized} has scheduled a 1:1 session with you.</p>
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date:</strong> ${bookingDate}</p>
              <p><strong>Time:</strong> ${bookingTime}</p>
              ${consultationNotes ? `<p><strong>Notes:</strong> ${consultationNotes}</p>` : ''}
            </div>
            <p style="color: #475569; font-size: 16px;">You can join the room via your dashboard when it's time.</p>
          </div>
        `,
      });

      if (resendError) {
        console.error('Resend error:', resendError)
      }
    }

    return NextResponse.json({ success: true, consultation })
  } catch (err: any) {
    console.error('API Error in /api/staff/schedule:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
