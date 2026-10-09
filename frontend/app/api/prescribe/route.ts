import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertDoctor, assertPatientOrAssignedProvider } from '@/lib/apiSecurity'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    // 1. Enforce doctor authentication and role
    await assertDoctor(request)

    const body = await request.json()
    const patientId = String(body?.patient_id || '').trim()
    const prescriptionType = String(body?.prescription_type || '').toUpperCase()

    if (!patientId || !UUID_REGEX.test(patientId)) {
      return NextResponse.json({ error: 'Valid patient ID is required' }, { status: 400 })
    }

    // 2. Enforce doctor clinical assignment to this patient (or admin access)
    await assertPatientOrAssignedProvider(request, patientId)

    if (prescriptionType !== 'INJECTABLE') {
      return NextResponse.json({
        error: 'Only injectable medication is supported for new prescriptions.'
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('health_assessments')
      .update({ prescription_type: 'INJECTABLE' })
      .eq('patient_id', patientId)

    if (error) {
      console.error('[Prescribe API Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Prescription saved!'
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    console.error('[Prescribe API Error]', err)
    return NextResponse.json({ error: err?.message || 'Failed to update prescription' }, { status })
  }
}
