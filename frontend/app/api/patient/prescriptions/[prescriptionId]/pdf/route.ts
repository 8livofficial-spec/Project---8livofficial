import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, assertPatientPrescriptionOwnership, errorResponse } from '@/lib/fulfilmentAuth'
import { createSignedPrescriptionUrl, ensurePrescriptionPdf } from '@/lib/prescriptionPdfService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { prescriptionId } = await context.params
    const requestUrl = new URL(request.url)
    const isDownload = requestUrl.searchParams.get('download') === '1' || requestUrl.searchParams.get('format') === 'pdf'

    const prescription = await assertPatientPrescriptionOwnership(prescriptionId, auth.user.id)

    let signedPdfPath = prescription.signed_pdf_path
    let fallbackBuffer: Buffer | undefined

    if (!signedPdfPath) {
      const generated = await ensurePrescriptionPdf(prescriptionId)
      signedPdfPath = generated.path
      fallbackBuffer = generated.pdfBuffer
    }

    await supabaseAdmin.from('fulfilment_audit_logs').insert({
      prescription_id: prescriptionId,
      actor_id: auth.user.id,
      actor_role: 'patient',
      action: 'PRESCRIPTION_DOCUMENT_ACCESSED',
      user_agent: request.headers.get('user-agent') || null,
    })

    if (isDownload) {
      let pdfBytes: Uint8Array
      if (fallbackBuffer) {
        pdfBytes = new Uint8Array(fallbackBuffer)
      } else {
        const { data: downloaded, error: dlErr } = await supabaseAdmin.storage
          .from('prescription-documents')
          .download(signedPdfPath)
        if (dlErr || !downloaded) {
          throw new Error('Failed to retrieve prescription PDF document.')
        }
        const arrayBuf = await downloaded.arrayBuffer()
        pdfBytes = new Uint8Array(arrayBuf)
      }

      const fileName = `8LIV-Prescription-${prescription.prescription_number || prescriptionId}.pdf`
      return new NextResponse(pdfBytes as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      })
    }

    const url = await createSignedPrescriptionUrl(signedPdfPath, 300)
    return NextResponse.json({ url, expiresIn: 300 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
