import { NextResponse } from 'next/server'
import { assertDietitian, assertDietitianPatientAccess, resolveTenant } from '@/lib/apiSecurity'
import { sendDietitianDoctorCommunication } from '@/lib/nutritionService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    let query = supabaseAdmin
      .from('dietitian_doctor_communications')
      .select('*, doctor:doctor_id(full_name), patient:patient_id(full_name)')
      .eq('dietitian_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (patientId) {
      await assertDietitianPatientAccess(request, patientId)
      query = query.eq('patient_id', patientId)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: true, communications: [] })
    }

    return NextResponse.json({ success: true, communications: data || [] })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch communications' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const tenantId = resolveTenant(request, auth.user)
    const body = await request.json()

    if (!body.patient_id || !body.doctor_id || !body.concern_summary || !body.message) {
      return NextResponse.json({ success: false, error: 'Patient ID, Doctor ID, summary, and message are required' }, { status: 400 })
    }

    // Verify access
    await assertDietitianPatientAccess(request, body.patient_id)

    const validTypes = ['PROGRESS_UPDATE', 'CLINICAL_CONCERN', 'FOLLOW_UP_REQUEST', 'TREATMENT_REVIEW_REQUEST', 'NUTRITION_SUMMARY']
    const commType = body.communication_type || 'CLINICAL_CONCERN'
    if (!validTypes.includes(commType)) {
      return NextResponse.json({ success: false, error: 'Invalid communication type' }, { status: 400 })
    }

    const comm = await sendDietitianDoctorCommunication(
      auth.user.id,
      {
        patient_id: body.patient_id,
        doctor_id: body.doctor_id,
        communication_type: commType,
        concern_summary: body.concern_summary,
        message: body.message,
      },
      tenantId,
      request
    )

    return NextResponse.json({ success: true, communication: comm })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to send communication' }, { status })
  }
}
