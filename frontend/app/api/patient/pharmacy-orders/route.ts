import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    const auth = await assertPatient(request)
    
    // 1. Try fetching with rich relational joins
    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*, prescriptions(prescription_number, issued_at, valid_until, treatment_cycle_id, prescription_items(*)), pharmacy_order_status_history(*)')
      .eq('patient_id', auth.user.id)
      .order('created_at', { ascending: false })
      
    if (!error) {
      const orders = data || []
      const cycleIds = Array.from(
        new Set(
          orders
            .map((o: any) => o.prescriptions?.treatment_cycle_id)
            .filter(Boolean)
        )
      )
      if (cycleIds.length > 0) {
        const { data: cycles } = await supabaseAdmin
          .from('treatment_cycles')
          .select('id, cycle_number, status, start_date, end_date')
          .in('id', cycleIds)
        const cycleMap = Object.fromEntries((cycles || []).map((c: any) => [c.id, c]))
        orders.forEach((o: any) => {
          if (o.prescriptions?.treatment_cycle_id) {
            o.treatment_cycles = cycleMap[o.prescriptions.treatment_cycle_id] || null
          }
        })
      }
      return NextResponse.json({ orders })
    }

    // 2. Fallback to basic query if relational joins fail
    console.warn('[pharmacy-orders] Relational query failed, falling back to basic query:', error.message)
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*')
      .eq('patient_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (fallbackError) {
      console.warn('[pharmacy-orders] Fallback query also returned error:', fallbackError.message)
      return NextResponse.json({ orders: [] })
    }

    return NextResponse.json({ orders: fallbackData || [] })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error, orders: [] }, { status: failure.status })
  }
}
