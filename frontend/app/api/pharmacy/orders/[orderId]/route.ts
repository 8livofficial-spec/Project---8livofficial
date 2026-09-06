import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyOrderAccess } from '@/lib/pharmacySecurity'
import { sanitizePharmacyOrderForFulfillment } from '@/lib/pharmacyOrderStateMachine'

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const context = await assertPharmacyOrderAccess(request, params.orderId)
    const { order } = context

    // Fetch doctor profile details for qualification and registration info
    const prescription = (order as any).prescriptions
    let doctorData: any = null
    if (prescription?.doctor_id) {
      const { data: docProfile } = await supabaseAdmin
        .from('doctor_profiles')
        .select('full_name, registration_number, medical_registration_number, qualification, mci_number')
        .eq('id', prescription.doctor_id)
        .maybeSingle()
      doctorData = docProfile
    }

    // Resolve treatment cycle relationship if not joined
    if (prescription?.treatment_cycle_id && !prescription.treatment_cycles && !order.treatment_cycles) {
      const { data: cycleData } = await supabaseAdmin
        .from('treatment_cycles')
        .select('id, cycle_number, status, start_date, end_date')
        .eq('id', prescription.treatment_cycle_id)
        .maybeSingle()
      if (cycleData) {
        prescription.treatment_cycles = cycleData
      }
    }

    const items = prescription?.prescription_items || []
    const sanitized = sanitizePharmacyOrderForFulfillment(order, prescription, items, doctorData)

    return NextResponse.json({ order: sanitized })
  } catch (err: any) {
    const status = err.status || 500
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve order details' },
      { status }
    )
  }
}
