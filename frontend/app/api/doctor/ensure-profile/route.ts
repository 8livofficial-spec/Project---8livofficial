import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const { doctor_id, email, first_name, last_name } = await request.json()

    if (!doctor_id) {
      return NextResponse.json({ error: 'Missing doctor_id.' }, { status: 400 })
    }

    // 1. Ensure profile exists in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: doctor_id,
        role: 'doctor',
        first_name: first_name || 'Dr',
        last_name: last_name || 'Doctor',
        email: email || null,
      })

    if (profileError) {
      return NextResponse.json({ error: `Doctor profile setup failed: ${profileError.message}` }, { status: 500 })
    }

    // 2. Ensure specialist profile exists in doctor_profiles table
    const { error: doctorProfileError } = await supabaseAdmin
      .from('doctor_profiles')
      .upsert({
        id: doctor_id,
        full_name: `Dr. ${first_name || ''} ${last_name || ''}`.trim() || 'Dr. Doctor',
        specialty: 'Endocrinologist',
      })

    if (doctorProfileError) {
      return NextResponse.json({ error: `Doctor specialist profile setup failed: ${doctorProfileError.message}` }, { status: 500 })
    }

    // 3. Ensure record exists in provider_profiles table
    const { error: providerProfileError } = await supabaseAdmin
      .from('provider_profiles')
      .upsert({
        provider_id: doctor_id,
        role: 'doctor',
        full_name: `Dr. ${first_name || ''} ${last_name || ''}`.trim() || 'Dr. Doctor',
        email: email || null,
        status: 'active',
        payout_amount: 500,
      })

    if (providerProfileError) {
      return NextResponse.json({ error: `Provider profile setup failed: ${providerProfileError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Doctor profiles synchronized successfully.' })
  } catch (err: unknown) {
    console.error('API Error in /api/doctor/ensure-profile:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
