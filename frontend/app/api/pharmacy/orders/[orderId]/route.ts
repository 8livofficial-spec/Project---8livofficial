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

    // Fetch doctor profile details for registration info
    const prescription = (order as any).prescriptions
    let doctorData: any = null
    if (prescription?.doctor_id) {
      const { data: docProfile } = await supabaseAdmin
        .from('doctor_profiles')
        .select('full_name, registration_number, medical_registration_number')
        .eq('id', prescription.doctor_id)
        .maybeSingle()
      doctorData = docProfile
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
