import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { staffId, patientId, role, notes } = body

    if (!staffId || !patientId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (role !== 'dietitian' && role !== 'trainer') {
      return NextResponse.json({ error: 'Invalid role. Must be dietitian or trainer.' }, { status: 400 })
    }

    // 1. Verify that the staff member is assigned to this patient
    const { data: assignment, error: assignErr } = await supabaseAdmin
      .from('care_team_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle()

    if (assignErr || !assignment) {
      return NextResponse.json({ error: 'No care team assignment found for this patient.' }, { status: 404 })
    }

    if (role === 'dietitian' && assignment.dietitian_id !== staffId) {
      return NextResponse.json({ error: 'Unauthorized. You are not the assigned dietitian for this patient.' }, { status: 403 })
    }

    if (role === 'trainer' && assignment.trainer_id !== staffId) {
      return NextResponse.json({ error: 'Unauthorized. You are not the assigned trainer for this patient.' }, { status: 403 })
    }

    // 2. Perform the update
    const updatePayload: any = {}
    if (role === 'dietitian') {
      updatePayload.dietitian_notes = notes || ''
    } else {
      updatePayload.trainer_notes = notes || ''
    }

    const { error: updateErr } = await supabaseAdmin
      .from('care_team_assignments')
      .update(updatePayload)
      .eq('patient_id', patientId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // 3. Insert notification for the patient
    const notificationTitle = role === 'dietitian' ? 'Nutrition Guidelines Updated' : 'Workout Plan Updated'
    const notificationMsg = role === 'dietitian' 
      ? 'Your dietitian has updated your personalized nutrition guidelines. Tap to view.' 
      : 'Your fitness trainer has updated your daily workout schedule. Tap to view.'

    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'progress',
        title: notificationTitle,
        message: notificationMsg,
        is_read: false
      })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('API Error in POST /api/staff/notes:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
