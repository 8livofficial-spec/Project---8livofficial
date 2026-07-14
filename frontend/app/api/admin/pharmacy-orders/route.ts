import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const params = new URL(request.url).searchParams
    const search = params.get('search')?.trim()
    const status = params.get('status')?.trim()
    let query = supabaseAdmin
      .from('pharmacy_orders')
      .select('*, prescriptions(*, prescription_items(*)), pharmacy_order_status_history(*)')
      .order('updated_at', { ascending: false })
      .limit(100)
    if (status) query = query.eq('status', status)
    if (search) {
      query = query.or(`apollo_order_reference.ilike.%${search}%,tracking_number.ilike.%${search}%`)
    }
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ orders: data || [] })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
