import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    const auth = await assertPatient(request)
    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*, prescriptions(prescription_number, issued_at, valid_until, prescription_items(*)), pharmacy_order_status_history(*)')
      .eq('patient_id', auth.user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ orders: data || [] })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Patients cannot create medicine orders directly. Orders are created when a doctor signs a prescription.' },
    { status: 410 },
  )
}
