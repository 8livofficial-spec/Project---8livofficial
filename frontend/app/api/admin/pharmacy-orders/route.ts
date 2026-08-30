import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const params = new URL(request.url).searchParams
    const search = params.get('search')?.trim()
    const status = params.get('status')?.trim()

    let orders: any[] = []

    // 1. Try rich relational query
    try {
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
      if (!error && data) {
        orders = data
      } else {
        throw error || new Error('Relational query failed')
      }
    } catch (err: any) {
      console.warn('[admin/pharmacy-orders] Relational query failed, falling back to basic query:', err?.message)
      // 2. Fallback to basic query
      try {
        let fallbackQuery = supabaseAdmin
          .from('pharmacy_orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (status) fallbackQuery = fallbackQuery.eq('status', status)
        const { data: fallbackData } = await fallbackQuery
        orders = fallbackData || []
      } catch (fallbackErr: any) {
        console.warn('[admin/pharmacy-orders] Fallback query error:', fallbackErr?.message)
        orders = []
      }
    }

    return NextResponse.json({ orders })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error, orders: [] }, { status: failure.status })
  }
}
