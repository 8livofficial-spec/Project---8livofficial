import { supabaseAdmin } from './supabaseServer'
import { audit } from './prescriptionService'

const BUCKET = 'provider-private-documents'
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function getDoctorSignatureBuffer(doctorId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const possiblePaths = [
    `signatures/${doctorId}/signature.png`,
    `signatures/${doctorId}/signature.jpg`,
    `signatures/${doctorId}/signature.jpeg`,
    `signatures/${doctorId}/signature.webp`,
  ]

  for (const path of possiblePaths) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path)
    if (!error && data) {
      const arrayBuffer = await data.arrayBuffer()
      const contentType = data.type || (path.endsWith('.png') ? 'image/png' : 'image/jpeg')
      return { buffer: Buffer.from(arrayBuffer), contentType }
    }
  }

  return null
}

export async function getDoctorSignatureSignedUrl(doctorId: string, expiresInSeconds = 900): Promise<string | null> {
  const possiblePaths = [
    `signatures/${doctorId}/signature.png`,
    `signatures/${doctorId}/signature.jpg`,
    `signatures/${doctorId}/signature.jpeg`,
    `signatures/${doctorId}/signature.webp`,
  ]

  for (const path of possiblePaths) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
    if (!error && data?.signedUrl) {
      return data.signedUrl
    }
  }

  return null
}

export async function saveDoctorSignature(
  doctorId: string,
  fileBuffer: Buffer,
  mimeType: string,
  request?: Request
): Promise<{ success: boolean; path: string }> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new Error('Unsupported signature format. Please upload PNG, JPEG, or WebP.')
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('Signature file size exceeds 2MB limit.')
  }

  const ext = mimeType.toLowerCase().includes('png') ? 'png' : 'jpg'
  const path = `signatures/${doctorId}/signature.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  })

  if (uploadError) throw uploadError

  // Attempt to sync doctor_profiles signature_url
  try {
    await supabaseAdmin.from('doctor_profiles').update({ signature_url: path }).eq('id', doctorId)
  } catch (err) {
    // If column doesn't exist yet, non-fatal
    console.warn('[doctorSignatureService] Non-fatal profile signature_url update note:', err)
  }

  await audit({
    actorId: doctorId,
    actorRole: 'doctor',
    action: 'DOCTOR_SIGNATURE_UPLOADED',
    newValues: { path, format: ext, size: fileBuffer.length },
    request,
  })

  return { success: true, path }
}

export async function deleteDoctorSignature(doctorId: string, request?: Request): Promise<boolean> {
  const possiblePaths = [
    `signatures/${doctorId}/signature.png`,
    `signatures/${doctorId}/signature.jpg`,
    `signatures/${doctorId}/signature.jpeg`,
    `signatures/${doctorId}/signature.webp`,
  ]

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(possiblePaths)
  if (error) {
    console.warn('[doctorSignatureService] Delete error:', error.message)
  }

  try {
    await supabaseAdmin.from('doctor_profiles').update({ signature_url: null }).eq('id', doctorId)
  } catch (err) {
    // Non-fatal
  }

  await audit({
    actorId: doctorId,
    actorRole: 'doctor',
    action: 'DOCTOR_SIGNATURE_REMOVED',
    request,
  })

  return true
}
