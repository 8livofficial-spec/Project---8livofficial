import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { createSignedPrescriptionUrl } from '@/lib/prescriptionPdfService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { prescriptionId } = await context.params
    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*), pharmacy_orders(*, pharmacy_order_status_history(*)), fulfilment_audit_logs(*)')
      .eq('id', prescriptionId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Prescription not found.')
    const signedPdfUrl = data.signed_pdf_path ? await createSignedPrescriptionUrl(data.signed_pdf_path, 300) : null
    await supabaseAdmin.from('fulfilment_audit_logs').insert({
      prescription_id: prescriptionId,
      actor_id: auth.user.id,
      actor_role: 'admin',
      action: 'ADMIN_PRESCRIPTION_VIEWED',
      user_agent: request.headers.get('user-agent') || null,
    })
    return NextResponse.json({ prescription: data, signedPdfUrl })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
