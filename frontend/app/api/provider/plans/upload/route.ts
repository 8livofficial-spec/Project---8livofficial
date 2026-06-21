import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedProvider, assignmentColumnForRole, trainerFallbackColumnForRole } from '@/lib/providerServer'
import { APP_CONFIG } from '@/lib/appConfig'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'

export async function POST(request: Request) {
  const ip = getClientIp(request)

  try {
    // 1. Authenticate Provider
    const authResult = await getAuthenticatedProvider(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const providerId = authResult.user.id
    const providerRole = authResult.role

    // Rate Limiting
    const rate = checkRateLimit(`uploads:${ip}:${providerId}`, APP_CONFIG.rateLimits.uploads)
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfter || 60, rate.message)
    }

    // 2. Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const patientId = formData.get('patientId') as string | null
    const planType = formData.get('planType') as string | null // 'diet' or 'fitness'
    const appointmentId = formData.get('appointmentId') as string | null

    if (!file || !patientId || !planType) {
      return NextResponse.json({ error: 'Missing file, patientId, or planType' }, { status: 400 })
    }

    if (planType !== 'diet' && planType !== 'fitness') {
      return NextResponse.json({ error: 'Invalid planType. Must be diet or fitness' }, { status: 400 })
    }

    // 3. Validate Role & Assignment
    // Dietitians can only upload to diet plans. Fitness coaches/trainers can only upload to fitness plans.
    if (planType === 'diet' && providerRole !== 'dietitian' && providerRole !== 'nutritionist') {
      return NextResponse.json({ error: 'Only dietitians can upload diet plans.' }, { status: 403 })
    }
    if (planType === 'fitness' && providerRole !== 'fitness_coach' && providerRole !== 'trainer') {
      return NextResponse.json({ error: 'Only fitness coaches can upload workout plans.' }, { status: 403 })
    }

    const assignmentColumn = assignmentColumnForRole(providerRole)
    const fallbackColumn = trainerFallbackColumnForRole(providerRole)

    if (!assignmentColumn) {
      return NextResponse.json({ error: 'Invalid provider role for plan assignment' }, { status: 403 })
    }

    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('care_team_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'No active care team assignment found for this patient.' }, { status: 403 })
    }

    const isAssigned = assignment[assignmentColumn] === providerId || (fallbackColumn && assignment[fallbackColumn] === providerId)
    if (!isAssigned) {
      return NextResponse.json({ error: 'You are not assigned to this patient.' }, { status: 403 })
    }

    // 4. File Validation (Size and Extension/Type)
    if (file.size > APP_CONFIG.uploads.sizeLimitBytes) {
      const sizeMB = APP_CONFIG.uploads.sizeLimitBytes / (1024 * 1024)
      return NextResponse.json({ error: `File size exceeds the limit of ${sizeMB}MB.` }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!APP_CONFIG.uploads.allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: `Invalid file extension .${ext}. Supported: ${APP_CONFIG.uploads.allowedExtensions.join(', ')}` }, { status: 400 })
    }

    // Double check mime types
    const allowedMime = APP_CONFIG.uploads.allowedMimeTypes.some(
      (mime) => mime.trim().toLowerCase() === file.type.toLowerCase()
    )
    // Excel/Spreadsheet can have varied mime types depending on OS, so extension check is primary, but validate mime type if it's common.
    if (!allowedMime && !['xlsx', 'xls'].includes(ext)) {
      return NextResponse.json({ error: `Unsupported file format: ${file.type}` }, { status: 400 })
    }

    // 5. Upload to Supabase Storage
    const bucketName = planType === 'diet' ? 'diet-plans' : 'fitness-plans'
    const fileName = `${appointmentId || 'plan'}_${Date.now()}.${ext}`
    const storagePath = `${patientId}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError.message)
      return NextResponse.json({ error: 'Failed to save file attachment.' }, { status: 500 })
    }

    // Return the combined bucket and path for reference
    const attachmentUrl = `${bucketName}/${storagePath}`

    return NextResponse.json({
      success: true,
      attachmentUrl,
      attachmentType: file.type,
      fileName: file.name
    })

  } catch (err: any) {
    console.error('API Error in /api/provider/plans/upload:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
