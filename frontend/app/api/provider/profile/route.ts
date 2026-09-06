import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getDoctorSignatureSignedUrl } from '@/lib/doctorSignatureService'

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

    const userId = auth.user.id

    // Query relevant profiles in parallel
    const [profileRes, v2Res, providerRes, doctorRes, signatureUrl] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('provider_profiles_v2').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('provider_profiles').select('*').eq('provider_id', userId).maybeSingle(),
      supabaseAdmin.from('doctor_profiles').select('*').eq('id', userId).maybeSingle(),
      getDoctorSignatureSignedUrl(userId).catch(() => null),
    ])

    const profile = profileRes.data || {}
    const v2 = v2Res.data || {}
    const providerRow = providerRes.data || {}
    const doctorRow = doctorRes.data || {}

    const resolvedFullName =
      v2.full_name ||
      doctorRow.full_name ||
      providerRow.full_name ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
      auth.user.email?.split('@')[0] ||
      'Care Provider'

    const resolvedSpecialization =
      v2.specialization ||
      doctorRow.specialty ||
      providerRow.specialization ||
      (role === 'doctor' ? 'Endocrinologist & Physician' : 'Clinical Care Specialist')

    const resolvedQualification =
      doctorRow.qualification ||
      v2.qualification ||
      providerRow.qualification ||
      ''

    const resolvedMci =
      doctorRow.mci_number ||
      doctorRow.registration_number ||
      v2.registration_number ||
      ''

    const resolvedCouncil =
      doctorRow.registration_council ||
      'Medical Council of India'

    const resolvedPhone =
      v2.phone_number ||
      profile.phone ||
      ''

    return NextResponse.json({
      profile: {
        id: userId,
        email: auth.user.email,
        role,
        full_name: resolvedFullName,
        first_name: profile.first_name || resolvedFullName.split(' ')[0] || '',
        last_name: profile.last_name || resolvedFullName.split(' ').slice(1).join(' ') || '',
        phone_number: resolvedPhone,
        specialization: resolvedSpecialization,
        qualification: resolvedQualification,
        mci_number: resolvedMci,
        registration_council: resolvedCouncil,
        bio: doctorRow.bio || providerRow.bio || '',
        languages: doctorRow.languages || providerRow.languages || 'English, Hindi',
        years_experience: doctorRow.years_experience || providerRow.years_experience || null,
        account_status: v2.account_status || providerRow.status || 'ACTIVE',
        onboarding_status: v2.onboarding_status || 'VERIFIED',
        clinical_verification_status: v2.clinical_verification_status || 'VERIFIED',
        hasSignature: !!signatureUrl,
        signaturePreviewUrl: signatureUrl || null,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve provider profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = String(auth.role || '').toLowerCase()
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const userId = auth.user.id

    const fullName = String(body.full_name || '').trim()
    const specialization = String(body.specialization || body.specialty || '').trim()
    const qualification = String(body.qualification || '').trim()
    const phoneNumber = String(body.phone_number || '').trim()
    const mciNumber = String(body.mci_number || body.registration_number || '').trim()
    const registrationCouncil = String(body.registration_council || '').trim()
    const bio = String(body.bio || '').trim()

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }

    const nameParts = fullName.split(' ')
    const firstName = nameParts[0] || fullName
    const lastName = nameParts.slice(1).join(' ') || ''

    // 1. Update profiles table
    try {
      await supabaseAdmin
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          ...(phoneNumber ? { phone: phoneNumber } : {}),
        })
        .eq('id', userId)
    } catch (e) {
      console.warn('[api/provider/profile] Profiles table update note:', e)
    }

    // 2. Update provider_profiles_v2 table
    try {
      const { data: v2Check } = await supabaseAdmin
        .from('provider_profiles_v2')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (v2Check) {
        await supabaseAdmin
          .from('provider_profiles_v2')
          .update({
            full_name: fullName,
            phone_number: phoneNumber,
            specialization: specialization,
            qualification: qualification,
          })
          .eq('user_id', userId)
      }
    } catch (e) {
      console.warn('[api/provider/profile] provider_profiles_v2 update note:', e)
    }

    // 3. Update provider_profiles table
    try {
      const { data: provCheck } = await supabaseAdmin
        .from('provider_profiles')
        .select('id')
        .eq('provider_id', userId)
        .maybeSingle()

      if (provCheck) {
        await supabaseAdmin
          .from('provider_profiles')
          .update({
            full_name: fullName,
            specialization: specialization,
            qualification: qualification,
          })
          .eq('provider_id', userId)
      } else {
        await supabaseAdmin.from('provider_profiles').insert({
          provider_id: userId,
          role: role === 'trainer' ? 'fitness_coach' : role,
          full_name: fullName,
          specialization: specialization,
          qualification: qualification,
          email: auth.user.email,
        })
      }
    } catch (e) {
      console.warn('[api/provider/profile] provider_profiles update note:', e)
    }

    // 4. Update or Upsert doctor_profiles table if role is doctor or fields provided
    if (role === 'doctor' || mciNumber || registrationCouncil) {
      try {
        const { data: docCheck } = await supabaseAdmin
          .from('doctor_profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()

        const docPayload: Record<string, any> = {
          full_name: fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`,
          specialty: specialization || 'Endocrinologist',
          qualification: qualification || null,
          mci_number: mciNumber || null,
          registration_council: registrationCouncil || null,
        }

        if (docCheck) {
          await supabaseAdmin.from('doctor_profiles').update(docPayload).eq('id', userId)
        } else {
          await supabaseAdmin.from('doctor_profiles').insert({
            id: userId,
            ...docPayload,
          })
        }
      } catch (e) {
        console.warn('[api/provider/profile] doctor_profiles update note:', e)
      }
    }

    // Fetch updated preview URL
    const signatureUrl = await getDoctorSignatureSignedUrl(userId).catch(() => null)

    return NextResponse.json({
      success: true,
      message: 'Provider profile updated successfully.',
      profile: {
        id: userId,
        email: auth.user.email,
        role,
        full_name: fullName,
        phone_number: phoneNumber,
        specialization,
        qualification,
        mci_number: mciNumber,
        registration_council: registrationCouncil,
        bio,
        hasSignature: !!signatureUrl,
        signaturePreviewUrl: signatureUrl,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update provider profile' },
      { status: 500 }
    )
  }
}
