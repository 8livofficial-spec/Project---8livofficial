import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    const auth = await assertPatient(request)

    // Attempt 1: Fetch prescriptions with related items & orders joined
    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*), pharmacy_orders(id, status, vendor, estimated_delivery_at, courier_name, tracking_number)')
      .eq('patient_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      return NextResponse.json({ prescriptions: data })
    }

    if (error) {
      console.warn('Nested query on prescriptions failed, attempting fallback query:', error.message)
      // Attempt 2: Fallback to querying prescriptions directly
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', auth.user.id)
        .order('created_at', { ascending: false })

      if (!fallbackError && fallbackData) {
        return NextResponse.json({ prescriptions: fallbackData })
      }

      if (fallbackError) {
        console.error('Fallback query on prescriptions failed:', fallbackError.message)
        // If table doesn't exist yet or is empty, return empty array gracefully
        return NextResponse.json({ prescriptions: [] })
      }
    }

    return NextResponse.json({ prescriptions: data || [] })
  } catch (err) {
    console.error('Error in /api/patient/prescriptions:', err)
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error, prescriptions: [] }, { status: failure.status })
  }
}
