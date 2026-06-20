import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { EmailService } from '@/lib/emailService'
import { createToken, getOrigin } from '@/lib/authSecurity'
import { assertAdmin } from '@/lib/apiSecurity'

const providerRoles = ['doctor', 'dietitian', 'nutritionist', 'fitness_coach']
const fallbackProviderRoles = ['doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer']

function isMissingProviderProfilesTable(error?: { message?: string; code?: string } | null) {
  const message = String(error?.message || '').toLowerCase()
  return error?.code === 'PGRST205' || message.includes('provider_profiles') || message.includes('schema cache')
}

async function loadFallbackProviders(search = '', from = 0, to = 24) {
  let query = supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email, phone_number, role', { count: 'exact' })
    .in('role', fallbackProviderRoles);

  if (search.trim()) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('role', { ascending: true })
    .range(from, to);

  if (error) throw error;

  const providers = (data || []).map((profile: any) => ({
    provider_id: profile.id,
    role: profile.role === 'trainer' ? 'fitness_coach' : profile.role,
    full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Provider',
    email: profile.email || '',
    phone_number: profile.phone_number || '',
    specialization: '',
    qualification: '',
    years_experience: 0,
    registration_number: '',
    profile_photo_url: '',
    consultation_type: 'Video Consultation',
    payout_amount: profile.role === 'doctor' ? 300 : 0,
    status: 'active',
    bank_account_details: {},
    upi_id: '',
    source: 'profiles_fallback',
  }));

  return { providers, count: count || 0 };
}

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const { searchParams } = new URL(request.url)

    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''

    const from = (page - 1) * limit
    const to = page * limit - 1

    let query = supabaseAdmin
      .from('provider_profiles')
      .select('*', { count: 'exact' });

    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      if (isMissingProviderProfilesTable(error)) {
        const { providers, count: fallbackCount } = await loadFallbackProviders(search, from, to)
        return NextResponse.json({
          providers,
          totalCount: fallbackCount,
          totalPages: Math.ceil(fallbackCount / limit),
          warning: 'provider_profiles table is not available yet. Showing providers from profiles fallback. Run Database/provider_management.sql and reload Supabase schema cache.',
        })
      }
      return NextResponse.json({ providers: [], totalCount: 0, totalPages: 0, warning: error.message })
    }
    return NextResponse.json({
      providers: data || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load providers' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await assertAdmin(request)
    const body = await request.json()
    const {
      fullName,
      email,
      password,
      phoneNumber,
      role,
      specialization,
      qualification,
      yearsExperience,
      registrationNumber,
      profilePhotoUrl,
      consultationType,
      payoutAmount,
      status,
      bankAccountDetails,
      upiId,
    } = body

    if (!fullName || !email || !password || !role) {
      return NextResponse.json({ error: 'Full name, email, password, and role are required.' }, { status: 400 })
    }
    if (!providerRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid provider role.' }, { status: 400 })
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { display_id: fullName, role },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

    const providerId = authData.user.id
    const [firstName, ...rest] = fullName.trim().split(/\s+/)
    const lastName = rest.join(' ')

    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: providerId,
      email,
      first_name: firstName || fullName,
      last_name: lastName || '',
      phone_number: phoneNumber || '',
      role,
    })
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

    const { error: providerErr } = await supabaseAdmin.from('provider_profiles').upsert({
      provider_id: providerId,
      role,
      full_name: fullName,
      email,
      phone_number: phoneNumber || '',
      specialization: specialization || '',
      qualification: qualification || '',
      years_experience: Number(yearsExperience || 0),
      registration_number: registrationNumber || '',
      profile_photo_url: profilePhotoUrl || '',
      consultation_type: consultationType || 'video',
      payout_amount: Number(payoutAmount || 0),
      status: status || 'active',
      bank_account_details: bankAccountDetails || {},
      upi_id: upiId || '',
      updated_at: new Date().toISOString(),
    })
    const usingProfilesFallback = Boolean(providerErr && isMissingProviderProfilesTable(providerErr))
    if (providerErr && !usingProfilesFallback) return NextResponse.json({ error: providerErr.message }, { status: 500 })

    if (role === 'doctor') {
      await supabaseAdmin.from('doctor_profiles').upsert({ id: providerId, full_name: `Dr. ${fullName}` })
    }

    await supabaseAdmin.from('doctor_wallet').upsert({
      doctor_id: providerId,
      balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
    })

    try {
      const { token, tokenHash } = createToken()
      await supabaseAdmin.from('email_verification_tokens').insert({
        user_id: providerId,
        email,
        token_hash: tokenHash,
        purpose: 'PROVIDER_INVITATION',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      await EmailService.sendProviderInvitation({
        email,
        name: fullName,
        patientId: providerId,
        role,
        link: `${getOrigin(request)}/verify-email?token=${encodeURIComponent(token)}`,
        expiresIn: '7 days',
      })
    } catch (emailError) {
      console.error('Failed to send provider invitation:', emailError)
    }

    return NextResponse.json({
      success: true,
      providerId,
      warning: usingProfilesFallback
        ? 'Provider login/profile was created, but provider_profiles metadata was skipped because the table is missing. Run Database/provider_management.sql.'
        : undefined,
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to create provider' }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await assertAdmin(request)
    const body = await request.json()
    const { providerId, updates } = body
    if (!providerId || !updates) {
      return NextResponse.json({ error: 'Missing providerId, or updates.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('provider_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('provider_id', providerId)

    if (error) {
      if (isMissingProviderProfilesTable(error)) {
        const fullName = updates.full_name ? String(updates.full_name).trim() : ''
        const [firstName, ...rest] = fullName.split(/\s+/)
        const profileUpdates: Record<string, string> = {}
        if (fullName) {
          profileUpdates.first_name = firstName || fullName
          profileUpdates.last_name = rest.join(' ')
        }
        if (updates.email) profileUpdates.email = updates.email
        if (updates.phone_number) profileUpdates.phone_number = updates.phone_number
        if (updates.role) profileUpdates.role = updates.role

        if (Object.keys(profileUpdates).length > 0) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', providerId)
          if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          warning: 'provider_profiles table is not available yet. Updated the base profile fallback only.',
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to update provider' }, { status })
  }
}
