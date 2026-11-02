import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { patientId } = await params
    const role = String(auth.role || '').toLowerCase()
    const isStaff = ['support_agent', 'care_coordinator', 'admin'].includes(role)
    if (!isStaff && auth.user.id !== patientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: reports, error } = await supabaseAdmin
      .from('patient_lab_reports')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[Support Lab GET] DB warning:', error.message)
      return NextResponse.json({ reports: [] })
    }

    return NextResponse.json({ reports: reports || [] })
  } catch (error: any) {
    console.error('[Support Lab GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { patientId } = await params

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
    }

    const role = String(auth.role || '').toLowerCase()
    const isStaff = ['support_agent', 'care_coordinator', 'admin'].includes(role)
    if (!isStaff && auth.user.id !== patientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const reportCategory = String(formData.get('reportCategory') || 'general_blood').trim()
    const testDate = String(formData.get('testDate') || '').trim() || null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A valid report file (PDF, JPG, PNG) is required.' }, { status: 400 })
    }

    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'Reports must be PDF, JPG, or PNG files.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be 10MB or smaller.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const safeExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'pdf'
    const storagePath = `lab_reports/${patientId}/${Date.now()}_${reportCategory}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('patient-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Support Lab Upload] Storage error:', uploadError.message)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // 2. Generate signed URL (1 year validity)
    const { data: signedData } = await supabaseAdmin.storage
      .from('patient-documents')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

    const fileUrl = signedData?.signedUrl || storagePath

    // 3. Record in patient_lab_reports
    const { data: labRecord, error: labInsertErr } = await supabaseAdmin
      .from('patient_lab_reports')
      .insert({
        patient_id: patientId,
        uploaded_by: auth.user.id,
        uploaded_by_role: auth.role || 'support_agent',
        report_category: reportCategory,
        test_date: testDate,
        file_name: file.name,
        file_url: fileUrl,
        file_path: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
      .select()
      .maybeSingle()

    if (labInsertErr) {
      console.warn('[Support Lab Upload] DB insert error (non-fatal):', labInsertErr.message)
    }

    // 4. Update latest health_assessment so doctor sees it immediately in consultation room
    try {
      const { data: assessment } = await supabaseAdmin
        .from('health_assessments')
        .select('id, medical_history')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (assessment?.id) {
        const medicalHistory = (assessment.medical_history as any) || {}
        const labWork = medicalHistory.lab_work || {}

        await supabaseAdmin
          .from('health_assessments')
          .update({
            medical_history: {
              ...medicalHistory,
              lab_work: {
                ...labWork,
                report_url: fileUrl,
                report_path: storagePath,
                report_date: testDate,
                category: reportCategory,
                uploaded_by: 'customer_care',
                uploaded_at: new Date().toISOString(),
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', assessment.id)
      }
    } catch (assessErr) {
      console.warn('[Support Lab Upload] Assessment sync warning:', assessErr)
    }

    // 5. Notify patient
    try {
      await supabaseAdmin.from('patient_notifications').insert({
        patient_id: patientId,
        type: 'lab_report',
        title: 'Blood Report Uploaded',
        message: `Your diagnostic report (${file.name}) has been uploaded by Customer Care and attached to your clinical file for doctor review.`,
        is_read: false,
      })
    } catch (notifErr) {
      console.warn('[Support Lab Upload] Notification error:', notifErr)
    }

    // 6. Record audit log
    try {
      await supabaseAdmin.from('support_audit_logs').insert({
        agent_id: auth.user.id,
        patient_id: patientId,
        action_type: 'upload_blood_report',
        details: {
          category: reportCategory,
          testDate,
          fileName: file.name,
          filePath: storagePath,
        },
      })
    } catch (auditErr) {
      console.warn('[Support Lab Upload] Audit log warning:', auditErr)
    }

    return NextResponse.json({
      success: true,
      report: {
        id: labRecord?.id || 'uploaded',
        fileName: file.name,
        category: reportCategory,
        testDate,
        url: fileUrl,
      },
    })
  } catch (error: any) {
    console.error('[Support Lab Upload] Unhandled error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
