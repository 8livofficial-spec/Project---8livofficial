import { NextResponse } from 'next/server'
import { assertDoctor, errorResponse } from '@/lib/fulfilmentAuth'
import {
  getDoctorSignatureSignedUrl,
  saveDoctorSignature,
  deleteDoctorSignature,
} from '@/lib/doctorSignatureService'

export async function GET(request: Request) {
  try {
    const auth = await assertDoctor(request)
    const previewUrl = await getDoctorSignatureSignedUrl(auth.user.id)
    return NextResponse.json({
      hasSignature: !!previewUrl,
      previewUrl,
    })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertDoctor(request)
    const contentType = request.headers.get('content-type') || ''
    let buffer: Buffer
    let mimeType = 'image/png'

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = (formData.get('signature') || formData.get('file')) as File | null
      if (!file) {
        return NextResponse.json({ error: 'Signature image file is required.' }, { status: 400 })
      }
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      mimeType = file.type || 'image/png'
    } else {
      try {
        const body = await request.json()
        const dataUrl = body.signatureDataUrl || body.dataUrl || ''
        if (!dataUrl || !dataUrl.includes(',')) {
          return NextResponse.json({ error: 'Invalid or missing signature drawing data.' }, { status: 400 })
        }
        const [header, base64Data] = dataUrl.split(',')
        const matches = header.match(/:(.*?);/)
        if (matches && matches[1]) {
          mimeType = matches[1]
        }
        buffer = Buffer.from(base64Data, 'base64')
      } catch (jsonErr) {
        try {
          const formData = await request.formData()
          const file = (formData.get('signature') || formData.get('file')) as File | null
          if (file) {
            const arrayBuffer = await file.arrayBuffer()
            buffer = Buffer.from(arrayBuffer)
            mimeType = file.type || 'image/png'
          } else {
            throw jsonErr
          }
        } catch {
          return NextResponse.json({ error: 'Unable to parse signature payload.' }, { status: 400 })
        }
      }
    }

    const result = await saveDoctorSignature(auth.user.id, buffer, mimeType, request, 'doctor')
    const previewUrl = await getDoctorSignatureSignedUrl(auth.user.id)

    return NextResponse.json({
      success: true,
      path: result.path,
      previewUrl,
      message: 'Doctor signature uploaded and secured successfully.',
    })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await assertDoctor(request)
    await deleteDoctorSignature(auth.user.id, request)
    return NextResponse.json({
      success: true,
      message: 'Doctor signature removed successfully.',
    })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
