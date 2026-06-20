import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { labelForRole, normalizeProviderRole } from '@/lib/providerConsultations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { staffId, patientId, role: rawRole, notes } = body
    const role = normalizeProviderRole(String(rawRole || ''))

    if (!staffId || !patientId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!['dietitian', 'nutritionist', 'fitness_coach'].includes(role)) {
      return NextResponse.json({ error: 'Invalid provider role.' }, { status: 400 })
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

    if (role === 'nutritionist' && assignment.nutritionist_id !== staffId) {
      return NextResponse.json({ error: 'Unauthorized. You are not the assigned nutritionist for this patient.' }, { status: 403 })
    }

    if (role === 'fitness_coach' && assignment.fitness_coach_id !== staffId && assignment.trainer_id !== staffId) {
      return NextResponse.json({ error: 'Unauthorized. You are not the assigned fitness coach for this patient.' }, { status: 403 })
    }

    // 2. Perform the update
    const updatePayload: any = {}
    if (role === 'dietitian') {
      updatePayload.dietitian_notes = notes || ''
    } else if (role === 'nutritionist') {
      updatePayload.nutritionist_notes = notes || ''
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
    const providerLabel = labelForRole(role)
    const notificationTitle = role === 'fitness_coach' ? 'Workout Plan Updated' : `${providerLabel} Guidance Updated`
    const notificationMsg = role === 'fitness_coach'
      ? 'Your fitness coach has updated your daily workout schedule. Tap to view.'
      : `Your ${providerLabel.toLowerCase()} has updated your personalized guidance. Tap to view.`

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
