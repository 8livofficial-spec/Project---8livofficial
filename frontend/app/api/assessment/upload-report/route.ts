import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A valid file is required.' }, { status: 400 })
    }

    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, PNG, and WebP files are allowed.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be 10 MB or smaller.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const safeExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'pdf'
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${safeExt}`
    const filePath = `lab_reports/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('patient-documents')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from('patient-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year signed url

    const secureUrl = (!signError && signedData?.signedUrl) ? signedData.signedUrl : filePath

    return NextResponse.json({
      success: true,
      url: secureUrl,
      path: filePath,
    })
  } catch (err: any) {
    console.error('Lab report upload error:', err)
    return NextResponse.json({ error: err.message || 'Failed to upload report.' }, { status: 500 })
  }
}

