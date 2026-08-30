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

    let patientsData: any[] = []
    let totalCount = 0

    try {
      let query = supabaseAdmin
        .from('health_assessments')
        .select('*', { count: 'exact' })

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
      if (!error && data) {
        patientsData = data
        totalCount = count || 0
      } else {
        throw error || new Error('Query error')
      }
    } catch (err: any) {
      console.warn('[admin/patients] Filtered query error, falling back:', err?.message)
      try {
        const { data, count } = await supabaseAdmin
          .from('health_assessments')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to)
        patientsData = data || []
        totalCount = count || 0
      } catch {
        patientsData = []
      }
    }

    let summary = { total: 0, eligible: 0, paid: 0, appointments: 0, progress: 0 }
    try {
      const [totalRes, eligibleRes, paidRes, apptRes, progRes] = await Promise.all([
        supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }),
        supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).eq('is_eligible', true),
        supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).eq('consultation_fee_paid', true),
        supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).not('booking_date', 'is', null),
        supabaseAdmin.from('health_assessments').select('id', { head: true, count: 'exact' }).not('weight_kg', 'is', null).not('goal_weight_kg', 'is', null),
      ])
      summary = {
        total: totalRes.count || totalCount,
        eligible: eligibleRes.count || 0,
        paid: paidRes.count || 0,
        appointments: apptRes.count || 0,
        progress: progRes.count || 0,
      }
    } catch (sErr) {
      summary.total = totalCount
    }

    return NextResponse.json({
      patients: patientsData,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      summary,
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load patients.' }, { status })
  }
}
