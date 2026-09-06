import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyOrderAccess } from '@/lib/pharmacySecurity'
import { sanitizePharmacyOrderForFulfillment } from '@/lib/pharmacyOrderStateMachine'

export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const { orderId } = await Promise.resolve(context.params)
    const accessContext = await assertPharmacyOrderAccess(request, orderId)
    const { order } = accessContext

    // Fetch doctor profile details for qualification and registration info
    const prescription = (order as any).prescriptions
    let doctorData: any = null
    if (prescription?.doctor_id) {
      const { data: docProfile } = await supabaseAdmin
        .from('doctor_profiles')
        .select('full_name, qualification, mci_number')
        .eq('id', prescription.doctor_id)
        .maybeSingle()
      doctorData = docProfile
    }

    // Dynamically resolve and verify patient profile and address details from DB
    if (
      !order.delivery_address_snapshot?.recipient_name ||
      order.delivery_address_snapshot.recipient_name === 'Patient' ||
      order.delivery_address_snapshot.recipient_name === 'Verified Patient'
    ) {
      const { data: patientProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, phone_number, display_id')
        .eq('id', order.patient_id)
        .maybeSingle()

      if (patientProfile) {
        const fullName =
          [patientProfile.first_name, patientProfile.last_name].filter(Boolean).join(' ') ||
          patientProfile.display_id ||
          'Patient'
        order.delivery_address_snapshot = {
          ...(order.delivery_address_snapshot || {}),
          recipient_name: fullName,
        }
        if (patientProfile.phone_number && !order.patient_phone_snapshot) {
          order.patient_phone_snapshot = patientProfile.phone_number
        }
      }
    }

    // If address line is missing in snapshot, pull from patient_delivery_addresses or health_assessments
    if (!order.delivery_address_snapshot?.line1) {
      const { data: defaultAddr } = await supabaseAdmin
        .from('patient_delivery_addresses')
        .select('*')
        .eq('patient_id', order.patient_id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (defaultAddr) {
        order.delivery_address_snapshot = {
          recipient_name: defaultAddr.recipient_name || order.delivery_address_snapshot?.recipient_name,
          phone: defaultAddr.phone || order.patient_phone_snapshot,
          line1: defaultAddr.line1,
          line2: defaultAddr.line2 || '',
          city: defaultAddr.city,
          state: defaultAddr.state,
          pincode: defaultAddr.pincode,
          address_id: defaultAddr.id,
        }
      } else {
        const { data: assessment } = await supabaseAdmin
          .from('health_assessments')
          .select('first_name, last_name, phone_number, address, shipping_state')
          .eq('patient_id', order.patient_id)
          .maybeSingle()

        if (assessment?.address) {
          order.delivery_address_snapshot = {
            recipient_name:
              order.delivery_address_snapshot?.recipient_name ||
              [assessment.first_name, assessment.last_name].filter(Boolean).join(' ') ||
              'Patient',
            phone: assessment.phone_number || order.patient_phone_snapshot,
            line1: assessment.address,
            city: 'Standard Delivery',
            state: assessment.shipping_state || '',
            pincode: '',
          }
        }
      }
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
