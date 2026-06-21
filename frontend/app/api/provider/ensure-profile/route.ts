import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providerId = auth.user.id
    const email = auth.user.email
    const userRole = auth.role

    const allowedRoles = ['doctor', 'dietitian', 'fitness_coach', 'nutritionist', 'trainer']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const first_name = auth.user.user_metadata?.first_name || auth.user.user_metadata?.display_id?.split(' ')[0] || 'Provider'
    const last_name = auth.user.user_metadata?.last_name || auth.user.user_metadata?.display_id?.split(' ').slice(1).join(' ') || ''
    const fullName = `${first_name} ${last_name}`.trim()

    // 1. Ensure profile exists in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: providerId,
        role: userRole,
        first_name: first_name,
        last_name: last_name,
        email: email || null,
      })

    if (profileError) {
      return NextResponse.json({ error: `Provider profile sync failed: ${profileError.message}` }, { status: 500 })
    }

    // 2. If it's a doctor, ensure doctor_profiles exists
    if (userRole === 'doctor') {
      const { error: doctorProfileError } = await supabaseAdmin
        .from('doctor_profiles')
        .upsert({
          id: providerId,
          full_name: `Dr. ${fullName}`,
          specialty: 'Endocrinologist',
        })

      if (doctorProfileError) {
        return NextResponse.json({ error: `Doctor specialist profile setup failed: ${doctorProfileError.message}` }, { status: 500 })
      }
    }

    // 3. Ensure record exists in provider_profiles table
    const { error: providerProfileError } = await supabaseAdmin
      .from('provider_profiles')
      .upsert({
        provider_id: providerId,
        role: userRole === 'trainer' ? 'fitness_coach' : userRole,
        full_name: userRole === 'doctor' ? `Dr. ${fullName}` : fullName,
        email: email || null,
        status: 'active',
      })

    if (providerProfileError) {
      return NextResponse.json({ error: `Provider profile setup failed: ${providerProfileError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Provider profile synchronized successfully.' })
  } catch (err: unknown) {
    console.error('API Error in /api/provider/ensure-profile:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
