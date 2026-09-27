import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { parseDeliveryMeta, formatAddressForNavigation, buildMapUrls } from '@/lib/driverDeliveryService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'active' // 'active' | 'completed' | 'all'

    let query = supabaseAdmin
      .from('pharmacy_orders')
      .select(`
        id,
        status,
        courier_name,
        tracking_number,
        delivery_address_snapshot,
        patient_phone_snapshot,
        created_at,
        shipped_at,
        delivered_at,
        internal_notes,
        prescriptions (
          prescription_number,
          prescription_items (
            medicine_name,
            dosage_form,
            strength,
            quantity
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      // In-house active runs
      query = query.in('status', ['STOCK_CONFIRMED', 'PREPARING', 'DISPATCHED'])
    } else if (filter === 'completed') {
      query = query.eq('status', 'DELIVERED').limit(30)
    } else {
      query = query.in('status', ['STOCK_CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED']).limit(50)
    }

    const { data: orders, error } = await query

    if (error) throw error

    // Transform and enrich orders for driver view
    const enriched = (orders || []).map((order: any) => {
      const meta = parseDeliveryMeta(order.internal_notes)
      const addressFormatted = formatAddressForNavigation(order.delivery_address_snapshot)
      const rx = order.prescriptions
      const rxItems = rx?.prescription_items || []
      const orderRef = `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`

      return {
        id: order.id,
        order_reference: orderRef,
        status: order.status,
        prescription_number: rx?.prescription_number || null,
        recipient_name: order.delivery_address_snapshot?.recipient_name || 'Patient',
        phone: order.patient_phone_snapshot || order.delivery_address_snapshot?.phone || null,
        destination_address: addressFormatted,
        address_snapshot: order.delivery_address_snapshot,
        items_count: rxItems.length,
        items_summary: rxItems.map((i: any) => `${i.medicine_name} (${i.dosage_form || 'med'} x${i.quantity || 1})`).join(', '),
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at,
        driver_meta: meta,
        map_urls: buildMapUrls(addressFormatted),
      }
    })

    return NextResponse.json({ orders: enriched })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve delivery orders' },
      { status: 500 }
    )
  }
}
