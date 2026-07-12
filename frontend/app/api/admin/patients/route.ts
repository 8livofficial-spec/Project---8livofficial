import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ilikePattern } from '@/lib/queryFilters'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '25')))
    const eligibility = searchParams.get('eligibility') || 'all'
    const membership = searchParams.get('membership') || 'all'
    const payment = searchParams.get('payment') || 'all'
    const appointment = searchParams.get('appointment') || 'all'
    const searchPattern = ilikePattern(searchParams.get('search') || '')
    const from = (page - 1) * limit
    const to = page * limit - 1

    let query = supabaseAdmin
      .from('health_assessments')
      .select(`
        id, patient_id, full_name, first_name, last_name, age, phone_number, address, dob_month, dob_day, dob_year, agree_terms,
        height_cm, weight_kg, goal_weight_kg, tried_weight_program, extra_medical_info, prescription_type,
        health_conditions_two, glp1_image_url,
        is_eligible, medical_history, booking_date, booking_time, room_url, local_food, workout_preference, created_at, consultation_fee_paid, membership_tier
      `, { count: 'exact' })

    if (searchPattern) {
      query = query.or(`full_name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},phone_number.ilike.${searchPattern}`)
    }
    if (eligibility !== 'all') query = query.eq('is_eligible', eligibility === 'true')
    if (membership !== 'all') query = query.ilike('membership_tier', ilikePattern(membership))
    if (payment !== 'all') query = query.eq('consultation_fee_paid', payment === 'paid')
    if (appointment !== 'all') {
      query = appointment === 'scheduled' ? query.not('booking_date', 'is', null) : query.is('booking_date', null)
    }

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to)
    if (error) throw error

    const [totalRes, eligibleRes, paidRes, apptRes, progRes] = await Promise.all([
      supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }),
      supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).eq('is_eligible', true),
      supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).eq('consultation_fee_paid', true),
      supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).not('booking_date', 'is', null),
      supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).not('weight_kg', 'is', null).not('goal_weight_kg', 'is', null),
    ])

    return NextResponse.json({
      patients: data || [],
      totalPages: Math.ceil((count || 0) / limit),
      summary: {
        total: totalRes.count || 0,
        eligible: eligibleRes.count || 0,
        paid: paidRes.count || 0,
        appointments: apptRes.count || 0,
        progress: progRes.count || 0,
      },
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load patients.' }, { status })
  }
}
