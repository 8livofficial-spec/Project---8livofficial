import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    const auth = await assertPatient(request)
    
    // 1. Try fetching with rich relational joins
    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*, prescriptions(prescription_number, issued_at, valid_until, prescription_items(*)), pharmacy_order_status_history(*)')
      .eq('patient_id', auth.user.id)
      .order('created_at', { ascending: false })
      
    if (!error) {
      return NextResponse.json({ orders: data || [] })
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
