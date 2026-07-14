import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, assertPatientPrescriptionOwnership, errorResponse } from '@/lib/fulfilmentAuth'
import { createSignedPrescriptionUrl } from '@/lib/prescriptionPdfService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { prescriptionId } = await context.params
    const prescription = await assertPatientPrescriptionOwnership(prescriptionId, auth.user.id)
    if (!prescription.signed_pdf_path) throw new Error('Signed prescription PDF is not available.')
    const url = await createSignedPrescriptionUrl(prescription.signed_pdf_path, 300)
    await supabaseAdmin.from('fulfilment_audit_logs').insert({
      prescription_id: prescriptionId,
      actor_id: auth.user.id,
      actor_role: 'patient',
      action: 'PRESCRIPTION_DOCUMENT_ACCESSED',
      user_agent: request.headers.get('user-agent') || null,
    })
    return NextResponse.json({ url, expiresIn: 300 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
