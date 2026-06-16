import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const adminId = searchParams.get('adminId')

    if (!patientId || !adminId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Verify admin role
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

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
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { adminId, patientId, doctorId, dietitianId, trainerId } = body

    if (!adminId || !patientId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Verify admin role
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    // 2. Upsert assignments
    const { error: assignmentErr } = await supabaseAdmin
      .from('care_team_assignments')
      .upsert({
        patient_id: patientId,
        doctor_id: doctorId || null,
        dietitian_id: dietitianId || null,
        trainer_id: trainerId || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'patient_id' })

    if (assignmentErr) {
      console.error('Database error on care_team_assignments write:', assignmentErr.message)
      return NextResponse.json({ error: 'Database table care_team_assignments is missing. Please run Database/fix_admin.sql in your Supabase SQL Editor first!' }, { status: 400 })
    }

    // 3. Resolve clinician name for notification logs
    let docNameStr = ''
    if (doctorId) {
      const { data: docData } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', doctorId)
        .maybeSingle()
      if (docData) {
        docNameStr = `Dr. ${docData.first_name} ${docData.last_name || ''}`.trim()
      }
    }

    // 4. Log patient notification update
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'consultation',
        title: 'Care Team Updated',
        message: `An administrator has updated your Care Team assignments.${docNameStr ? ` Your assigned physician is ${docNameStr}.` : ''}`,
        is_read: false
      })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API Error in /api/admin/assignments:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
