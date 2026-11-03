import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientId = auth.user.id

    // 1. Fetch from patient_lab_reports
    const { data: records, error } = await supabaseAdmin
      .from('patient_lab_reports')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('patient_lab_reports lookup notice:', error.message)
    }

    // 2. Also check if intake lab report exists in health_assessments
    const { data: assess } = await supabaseAdmin
      .from('health_assessments')
      .select('id, medical_history, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const embeddedLab = assess?.medical_history?.lab_work || null
    const allRecords = [...(records || [])]

    if (embeddedLab?.report_url && !allRecords.some(r => r.file_url === embeddedLab.report_url)) {
      allRecords.push({
        id: 'intake-assessment-report',
        patient_id: patientId,
        report_category: 'blood_test',
        test_date: embeddedLab.report_date || null,
        file_name: 'Initial Health Assessment Report',
        file_url: embeddedLab.report_url,
        file_path: null,
        mime_type: 'application/pdf',
        file_size_bytes: null,
        created_at: embeddedLab.uploaded_at || assess?.created_at,
        is_intake: true
      })
    }

    // 3. Generate signed URLs for private storage paths
    const formatted = await Promise.all(
      allRecords.map(async (rec) => {
        let viewUrl = rec.file_url
        if (rec.file_path) {
          try {
            const { data: signed } = await supabaseAdmin.storage
              .from('patient-documents')
              .createSignedUrl(rec.file_path, 3600 * 24) // 24 hours
            if (signed?.signedUrl) viewUrl = signed.signedUrl
          } catch (e) {
            console.warn('Storage signed URL notice:', e)
          }
        }
        return {
          id: rec.id,
          patient_id: rec.patient_id,
          report_category: rec.report_category || 'blood_test',
          test_date: rec.test_date,
          file_name: rec.file_name || 'Medical Document',
          file_url: viewUrl,
          file_path: rec.file_path,
          mime_type: rec.mime_type || 'application/pdf',
          file_size_bytes: rec.file_size_bytes,
          created_at: rec.created_at,
          is_intake: Boolean(rec.is_intake)
        }
      })
    )

    return NextResponse.json({ success: true, records: formatted })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientId = auth.user.id
    const formData = await request.formData()
    const file = formData.get('file')
    const reportCategory = String(formData.get('reportCategory') || 'blood_test').trim()
    const customTitle = String(formData.get('title') || '').trim()
    const testDate = String(formData.get('testDate') || '').trim() || null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A valid file (PDF, JPG, PNG, WebP) is required.' }, { status: 400 })
    }

    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'Files must be PDF, JPG, PNG, or WebP.' }, { status: 400 })
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be 15MB or smaller.' }, { status: 400 })
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
      console.error('[Patient Upload] Storage error:', uploadError.message)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // 2. Generate signed URL
    const { data: signedData } = await supabaseAdmin.storage
      .from('patient-documents')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

    const fileUrl = signedData?.signedUrl || storagePath
    const fileName = customTitle || file.name

    // 3. Save into patient_lab_reports
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('patient_lab_reports')
      .insert({
        patient_id: patientId,
        uploaded_by: patientId,
        uploaded_by_role: 'patient',
        report_category: reportCategory,
        test_date: testDate,
        file_name: fileName,
        file_url: fileUrl,
        file_path: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
      })
      .select()
      .maybeSingle()

    if (insertError) {
      console.warn('[Patient Upload] DB insert notice:', insertError.message)
    }

    return NextResponse.json({
      success: true,
      record: {
        id: inserted?.id || `temp-${Date.now()}`,
        patient_id: patientId,
        report_category: reportCategory,
        test_date: testDate,
        file_name: fileName,
        file_url: fileUrl,
        file_path: storagePath,
        mime_type: file.type,
        file_size_bytes: file.size,
        created_at: inserted?.created_at || new Date().toISOString()
      }
    })
  } catch (err: unknown) {
    console.error('[Patient Upload] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

