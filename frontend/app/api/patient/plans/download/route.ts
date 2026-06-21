import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { searchParams } = new URL(request.url)
  const attachmentUrl = searchParams.get('url') || ''

  if (!attachmentUrl) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 })
  }

  // Parse path: bucketName/patientId/filename
  const parts = attachmentUrl.split('/')
  if (parts.length < 3) {
    return NextResponse.json({ error: 'Invalid file url format' }, { status: 400 })
  }
  const bucketName = parts[0]
  const filePatientId = parts[1]
  const relativePath = parts.slice(1).join('/')

  if (bucketName !== 'diet-plans' && bucketName !== 'fitness-plans') {
    return NextResponse.json({ error: 'Invalid bucket target' }, { status: 400 })
  }

  try {
    let userId = ''
    let userRole = ''

    // 1. Try Patient Auth
    const patientAuth = await getAuthenticatedPatient(request)
    if (!('error' in patientAuth)) {
      userId = patientAuth.user.id
      userRole = 'patient'
    } else {
      // 2. Try Provider Auth
      const providerAuth = await getAuthenticatedProvider(request)
      if (!('error' in providerAuth)) {
        userId = providerAuth.user.id
        userRole = providerAuth.role
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: invalid session' }, { status: 401 })
    }

    // Rate Limiting
    const rate = checkRateLimit(`download:${ip}:${userId}`, APP_CONFIG.rateLimits.uploads)
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfter || 60, rate.message)
    }

    // 3. Verify Access
    let isAuthorized = false

    if (userId === filePatientId) {
      // Patient owns the file
      isAuthorized = true
    } else if (userRole === 'admin') {
      // Admin has universal access
      isAuthorized = true
    } else if (['dietitian', 'fitness_coach', 'trainer', 'nutritionist'].includes(userRole)) {
      // Check if provider is assigned
      const { data: assignment } = await supabaseAdmin
        .from('care_team_assignments')
        .select('*')
        .eq('patient_id', filePatientId)
        .maybeSingle()

      if (assignment) {
        if (
          assignment.dietitian_id === userId ||
          assignment.fitness_coach_id === userId ||
          assignment.trainer_id === userId ||
          assignment.nutritionist_id === userId
        ) {
          isAuthorized = true
        }
      }
    } else if (userRole === 'doctor') {
      // Check if doctor has a consultation with this patient
      const { data: consultation } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id')
        .eq('patient_id', filePatientId)
        .eq('doctor_id', userId)
        .limit(1)
        .maybeSingle()

      if (consultation) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: access denied' }, { status: 403 })
    }

    // 4. Generate Temporary Signed URL
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(relativePath, 60) // expires in 60 seconds

    if (signedError || !signedData?.signedUrl) {
      console.error('Failed to create signed URL:', signedError?.message)
      return NextResponse.json({ error: 'Failed to generate download link.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: signedData.signedUrl
    })

  } catch (err: any) {
    console.error('API Error in /api/patient/plans/download:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
