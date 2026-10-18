import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { normalizePhoneNumber } from '@/lib/phone'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientId = auth.user.id

    const [profileRes, assessmentRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .maybeSingle(),
      supabaseAdmin
        .from('health_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const profile = profileRes.data || null
    const assessment = assessmentRes.data || null

    const resolvedFirstName =
      profile?.first_name ||
      assessment?.first_name ||
      auth.user.user_metadata?.first_name ||
      auth.user.user_metadata?.full_name?.split(' ')?.[0] ||
      ''

    const resolvedLastName =
      profile?.last_name ||
      assessment?.last_name ||
      auth.user.user_metadata?.last_name ||
      auth.user.user_metadata?.full_name?.split(' ')?.slice(1)?.join(' ') ||
      ''

    const resolvedPhone =
      profile?.phone_number ||
      assessment?.phone_number ||
      auth.user.user_metadata?.phone_number ||
      auth.user.phone ||
      ''

    return NextResponse.json({
      profile: profile ? { ...profile, first_name: resolvedFirstName, last_name: resolvedLastName, phone_number: resolvedPhone } : null,
      assessment: assessment ? { ...assessment, first_name: resolvedFirstName, last_name: resolvedLastName, phone_number: resolvedPhone } : null,
      email: auth.user.email,
    })
  } catch (err: unknown) {
    console.error('API Error in GET /api/patient/profile:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientId = auth.user.id
    const body = await request.json()
    const {
      firstName = '',
      lastName = '',
      phoneNumber = '',
      age,
      height,
      weight,
      goalWeight,
    } = body

    const cleanFirstName = String(firstName || '').trim()
    const cleanLastName = String(lastName || '').trim()
    const rawPhone = String(phoneNumber || '').trim()

    const normalizedPhone = normalizePhoneNumber(rawPhone)
    if (rawPhone && !normalizedPhone.isValid) {
      return NextResponse.json(
        { error: 'Please enter a valid mobile number with country code (e.g. +91 98765 43210).' },
        { status: 400 }
      )
    }

    const parsedAge = age ? parseInt(String(age), 10) : null
    const parsedHeight = height ? parseFloat(String(height)) : null
    const parsedWeight = weight ? parseFloat(String(weight)) : null
    const parsedGoalWeight = goalWeight ? parseFloat(String(goalWeight)) : null

    const displayName = [cleanFirstName, cleanLastName].filter(Boolean).join(' ') || auth.user.email?.split('@')[0] || 'Patient'

    // 1. Update Profiles Table via supabaseAdmin (avoids client-side RLS recursion error 42P17)
    const { data: updatedProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: patientId,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        display_id: displayName,
        phone_number: normalizedPhone.isValid ? normalizedPhone.e164 : rawPhone || null,
        email: auth.user.email || null,
        role: 'patient',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileErr) throw profileErr

    // 2. Update Health Assessments Table via supabaseAdmin
    const { data: existingAssess } = await supabaseAdmin
      .from('health_assessments')
      .select('id, medical_history')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)

    const updateData: Record<string, unknown> = {
      first_name: cleanFirstName,
      last_name: cleanLastName,
      phone_number: normalizedPhone.isValid ? normalizedPhone.e164 : rawPhone || null,
      age: parsedAge,
      height_cm: parsedHeight,
      weight_kg: parsedWeight,
      goal_weight_kg: parsedGoalWeight,
      updated_at: new Date().toISOString(),
    }

    let updatedAssessment = null

    if (existingAssess && existingAssess.length > 0) {
      const currentMedHistory = (existingAssess[0].medical_history as Record<string, unknown>) || {}
      if (parsedHeight && parsedWeight) {
        const heightM = parsedHeight / 100
        const computedBmi = Number((parsedWeight / (heightM * heightM)).toFixed(1))
        updateData.medical_history = {
          ...currentMedHistory,
          bmi: computedBmi,
        }
      }

      const { data: aData, error: aErr } = await supabaseAdmin
        .from('health_assessments')
        .update(updateData)
        .eq('id', existingAssess[0].id)
        .select()
        .single()

      if (aErr) throw aErr
      updatedAssessment = aData
    } else {
      const { data: aData, error: aErr } = await supabaseAdmin
        .from('health_assessments')
        .insert({
          patient_id: patientId,
          ...updateData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (aErr) throw aErr
      updatedAssessment = aData
    }

    // 3. Log initial weight log if provided
    if (parsedWeight) {
      const today = new Date().toISOString().split('T')[0]
      const { data: existingWeightLog } = await supabaseAdmin
        .from('weight_logs')
        .select('id')
        .eq('patient_id', patientId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .limit(1)

      if (!existingWeightLog || existingWeightLog.length === 0) {
        await supabaseAdmin.from('weight_logs').insert({
          patient_id: patientId,
          weight_kg: parsedWeight,
          created_at: new Date().toISOString(),
        })
      }
    }

    // 4. Create notification
    try {
      await supabaseAdmin
        .from('patient_notifications')
        .insert({
          patient_id: patientId,
          type: 'profile',
          title: 'Profile Updated',
          message: 'Your personal biometrics and profile details have been saved.',
          is_read: false,
          created_at: new Date().toISOString(),
        })
    } catch {
      // Non-critical notification failure ignored
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      assessment: updatedAssessment,
      message: 'Profile details successfully updated.',
    })
  } catch (err: unknown) {
    console.error('API Error in POST /api/patient/profile:', err)
    const message = err instanceof Error ? err.message : 'Failed to update profile.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
