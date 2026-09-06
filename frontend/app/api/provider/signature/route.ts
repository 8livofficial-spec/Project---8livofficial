import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import {
  getDoctorSignatureSignedUrl,
  saveDoctorSignature,
  deleteDoctorSignature,
} from '@/lib/doctorSignatureService'

const ALLOWED_ROLES = ['doctor', 'dietitian', 'fitness_coach', 'nutritionist', 'trainer', 'admin']

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = String(auth.role || '').toLowerCase()
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const previewUrl = await getDoctorSignatureSignedUrl(auth.user.id)
    return NextResponse.json({
      hasSignature: !!previewUrl,
      previewUrl,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve signature' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = String(auth.role || '').toLowerCase()
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    let buffer: Buffer
    let mimeType = 'image/png'

    if (contentType.includes('application/json')) {
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
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('signature') as File | null
      if (!file) {
        return NextResponse.json({ error: 'Signature file is required.' }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      mimeType = file.type || 'image/png'
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type. Please use multipart/form-data or application/json.' }, { status: 400 })
    }

    const result = await saveDoctorSignature(auth.user.id, buffer, mimeType, request)
    const previewUrl = await getDoctorSignatureSignedUrl(auth.user.id)

    return NextResponse.json({
      success: true,
      path: result.path,
      previewUrl,
      message: 'Digital signature securely uploaded and registered.',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save digital signature' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = String(auth.role || '').toLowerCase()
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteDoctorSignature(auth.user.id, request)
    return NextResponse.json({
      success: true,
      message: 'Digital signature removed successfully.',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete digital signature' },
      { status: 500 }
    )
  }
}
