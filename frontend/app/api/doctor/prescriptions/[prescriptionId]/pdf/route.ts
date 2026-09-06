import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertDoctor, errorResponse } from '@/lib/fulfilmentAuth'
import { createSignedPrescriptionUrl, ensurePrescriptionPdf } from '@/lib/prescriptionPdfService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertDoctor(request)
    const { prescriptionId } = await context.params
    const requestUrl = new URL(request.url)
    const isDownload = requestUrl.searchParams.get('download') === '1' || requestUrl.searchParams.get('format') === 'pdf'

    const { data: prescription, error } = await supabaseAdmin
      .from('prescriptions')
      .select('id, signed_pdf_path, doctor_id, status, prescription_number')
      .eq('id', prescriptionId)
      .maybeSingle()

    if (error) throw error
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 })
    }

    if (prescription.doctor_id !== auth.user.id) {
      // Check if admin
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .maybeSingle()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

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
      actor_role: 'doctor',
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

    const url = await createSignedPrescriptionUrl(signedPdfPath, 900)
    return NextResponse.json({ url, expiresIn: 900 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
