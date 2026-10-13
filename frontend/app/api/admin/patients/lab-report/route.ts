import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { invalidatePatientApiDashboardCache } from '@/lib/patientDashboardCache'

export async function POST(request: Request) {
  try {
    await assertAdmin(request)
    const formData = await request.formData()
    const patientId = String(formData.get('patientId') || '').trim()
    const file = formData.get('file')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required.' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A lab report file is required.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const safeExt = ['pdf', 'jpg', 'jpeg', 'png'].includes(ext) ? ext : 'pdf'
    const path = `lab_reports/${patientId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('patient-documents')
      .upload(path, buffer, {
        contentType: file.type || (safeExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: signedData } = await supabaseAdmin.storage
      .from('patient-documents')
      .createSignedUrl(path, 60 * 60 * 24 * 365)

    const reportUrl = signedData?.signedUrl || path

    const { data: assessment, error: lookupError } = await supabaseAdmin
      .from('health_assessments')
      .select('id, medical_history')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!assessment?.id) {
      return NextResponse.json({ error: 'Assessment not found for this patient.' }, { status: 404 })
    }

    const medicalHistory = assessment.medical_history && typeof assessment.medical_history === 'object'
      ? assessment.medical_history as Record<string, unknown>
      : {}
    const labWork = medicalHistory.lab_work && typeof medicalHistory.lab_work === 'object'
      ? medicalHistory.lab_work as Record<string, unknown>
      : {}

    const updatedMedicalHistory = {
      ...medicalHistory,
      lab_work: {
        ...labWork,
        preference: labWork.preference || 'third_party',
        report_url: reportUrl,
        report_path: path,
        uploaded_by_admin: true,
        uploaded_at: new Date().toISOString(),
      },
    }

    const { error: updateError } = await supabaseAdmin
      .from('health_assessments')
      .update({ medical_history: updatedMedicalHistory, updated_at: new Date().toISOString() })
      .eq('id', assessment.id)

    if (updateError) throw updateError
    invalidatePatientApiDashboardCache(patientId)

    return NextResponse.json({
      success: true,
      labWork: updatedMedicalHistory.lab_work,
      reportUrl,
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Unable to upload lab report.' }, { status })
  }
}
