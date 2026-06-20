import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Verify admin role
    await assertAdmin(request)

    // 2. Fetch assignments
    const { data, error } = await supabaseAdmin
      .from('care_team_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle()

    if (error) {
      console.warn('Failed to query care_team_assignments. Table might be missing:', error.message)
      return NextResponse.json({ assignment: null, warning: 'Table care_team_assignments missing. Run Database/fix_admin.sql' })
    }

    return NextResponse.json({ assignment: data })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await assertAdmin(request)
    const body = await request.json()
    const { patientId, doctorId, dietitianId, nutritionistId, fitnessCoachId, trainerId } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 2. Upsert assignments
    const { error: assignmentErr } = await supabaseAdmin
      .from('care_team_assignments')
      .upsert({
        patient_id: patientId,
        doctor_id: doctorId || null,
        dietitian_id: dietitianId || null,
        nutritionist_id: nutritionistId || null,
        fitness_coach_id: fitnessCoachId || trainerId || null,
        trainer_id: trainerId || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'patient_id' })

    if (assignmentErr) {
      console.error('Database error on care_team_assignments write:', assignmentErr.message)
      return NextResponse.json({ error: 'Database table care_team_assignments is missing. Please run Database/fix_admin.sql in your Supabase SQL Editor first!' }, { status: 400 })
    }

    // 3. Log patient notification update without exposing clinician identity
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'consultation',
        title: 'Care Team Updated',
        message: 'An administrator has updated your Care Team assignments. Your care pathway is up to date.',
        is_read: false
      })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API Error in /api/admin/assignments:', err)
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}
