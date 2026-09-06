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
    const formData = await request.formData()
    const file = formData.get('signature') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Signature image file is required.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type || 'image/png'

    const result = await saveDoctorSignature(auth.user.id, buffer, mimeType, request)
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
