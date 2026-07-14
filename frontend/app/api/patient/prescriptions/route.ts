import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    const auth = await assertPatient(request)
    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*), pharmacy_orders(id, status, vendor, estimated_delivery_at, courier_name, tracking_number)')
      .eq('patient_id', auth.user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ prescriptions: data || [] })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
