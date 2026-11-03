import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const patientId = auth.user.id
    const body = await request.json()

    const updatePayload: Record<string, any> = {}
    if (body.title || body.file_name) updatePayload.file_name = String(body.title || body.file_name).trim()
    if (body.reportCategory || body.report_category) updatePayload.report_category = String(body.reportCategory || body.report_category).trim()
    if (body.testDate !== undefined) updatePayload.test_date = body.testDate || null

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields provided to update.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('patient_lab_reports')
      .update(updatePayload)
      .eq('id', id)
      .eq('patient_id', patientId)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, record: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const patientId = auth.user.id

    // 1. Fetch file record to delete from storage as well
    const { data: record } = await supabaseAdmin
      .from('patient_lab_reports')
      .select('id, file_path')
      .eq('id', id)
      .eq('patient_id', patientId)
      .maybeSingle()

    if (record?.file_path) {
      try {
        await supabaseAdmin.storage
          .from('patient-documents')
          .remove([record.file_path])
      } catch (e) {
        console.warn('Storage file deletion notice:', e)
      }
    }

    // 2. Delete row
    const { error } = await supabaseAdmin
      .from('patient_lab_reports')
      .delete()
      .eq('id', id)
      .eq('patient_id', patientId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Record deleted successfully.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

