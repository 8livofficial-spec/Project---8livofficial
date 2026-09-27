import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { parseDeliveryMeta, formatAddressForNavigation, buildMapUrls } from '@/lib/driverDeliveryService'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params

    const { data: order, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select(`
        *,
        prescriptions (
          id,
          prescription_number,
          issued_at,
          doctor_id,
          prescription_items (
            id,
            medicine_name,
            dosage_form,
            strength,
            dose,
            frequency,
            quantity,
            special_instruction
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Delivery order not found.' }, { status: 404 })
    }

    const rx = order.prescriptions
    const items = rx?.prescription_items || []
    const meta = parseDeliveryMeta(order.internal_notes)
    const addressFormatted = formatAddressForNavigation(order.delivery_address_snapshot)
    const mapUrls = buildMapUrls(addressFormatted)

    const payload = {
      id: order.id,
      order_reference: `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`,
      status: order.status,
      prescription_number: rx?.prescription_number,
      created_at: order.created_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      courier_name: order.courier_name,
      tracking_number: order.tracking_number,

      // Recipient Details
      patient: {
        name: order.delivery_address_snapshot?.recipient_name || 'Patient',
        phone: order.patient_phone_snapshot || order.delivery_address_snapshot?.phone || null,
        address: order.delivery_address_snapshot,
        formatted_address: addressFormatted,
      },

      // Navigation Links
      navigation: {
        destination_query: addressFormatted,
        google_maps_navigate: mapUrls.navigationUrl,
        google_maps_search: mapUrls.searchUrl,
        embed_map_url: mapUrls.embedUrl,
      },

      // In-House Driver State
      driver_meta: {
        delivery_mode: meta.delivery_mode || 'IN_HOUSE',
        driver_name: meta.driver_name || null,
        driver_phone: meta.driver_phone || null,
        delivery_slot: meta.delivery_slot || 'Within 2-4 Hours',
        otp_active: Boolean(meta.delivery_otp),
        otp_generated_at: meta.otp_generated_at || null,
        driver_arrived_at: meta.driver_arrived_at || null,
        otp_verified_at: meta.otp_verified_at || null,
      },

      // Prescribed Items to Deliver
      items: items.map((item: any) => ({
        id: item.id,
        medicine_name: item.medicine_name,
        dosage_form: item.dosage_form,
        strength: item.strength,
        dose: item.dose,
        frequency: item.frequency,
        quantity: item.quantity,
        special_instruction: item.special_instruction,
      })),
    }

    return NextResponse.json({ order: payload })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve delivery run details' },
      { status: 500 }
    )
  }
}
