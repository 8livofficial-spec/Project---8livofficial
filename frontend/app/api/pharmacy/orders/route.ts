import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyStaff } from '@/lib/pharmacySecurity'

export async function GET(request: Request) {
  try {
    const context = await assertPharmacyStaff(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')?.trim().toUpperCase()
    const search = url.searchParams.get('search')?.trim()

    let query = supabaseAdmin
      .from('pharmacy_orders')
      .select('*, prescriptions(prescription_number, issued_at, valid_until, prescription_items(*))')
      .order('created_at', { ascending: false })

    // Strict Tenant / Pharmacy isolation:
    // A partner pharmacy can ONLY access orders explicitly assigned to its pharmacy_id.
    // Unassigned orders (pharmacy_id IS NULL) must NEVER be exposed to partner pharmacies.
    if (!context.isAdmin) {
      query = query.eq('pharmacy_id', context.pharmacy.id)
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`tracking_number.ilike.%${search}%,dispatch_tracking_number.ilike.%${search}%`)
    }

    const { data: orders, error } = await query.limit(100)

    if (error) {
      console.warn('[api/pharmacy/orders] Error fetching orders:', error.message)
      return NextResponse.json({ error: error.message, orders: [] }, { status: 500 })
    }

    // Dynamically resolve real patient names & locations for orders where missing or generic
    const patientIds = Array.from(new Set((orders || []).map((o: any) => o.patient_id).filter(Boolean)))
    let profileMap: Record<string, any> = {}
    if (patientIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, display_id, phone_number')
        .in('id', patientIds)
      if (profs) {
        profs.forEach((p: any) => {
          profileMap[p.id] = p
        })
      }
    }

    const enrichedOrders = (orders || []).map((o: any) => {
      const prof = profileMap[o.patient_id]
      const realFullName = prof
        ? [prof.first_name, prof.last_name].filter(Boolean).join(' ') || prof.display_id
        : null

      const currentPatientName =
        o.delivery_address_snapshot?.patient_name || o.delivery_address_snapshot?.recipient_name

      const isGenericOrDummy =
        !currentPatientName ||
        currentPatientName === 'Patient' ||
        currentPatientName === 'Verified Patient' ||
        currentPatientName === 'Ananya Deshmukh'

      const effectivePatientName = isGenericOrDummy
        ? (realFullName || currentPatientName || 'Patient')
        : currentPatientName

      return {
        ...o,
        delivery_address_snapshot: {
          ...(o.delivery_address_snapshot || {}),
          patient_name: effectivePatientName,
          recipient_name: effectivePatientName,
          phone: o.patient_phone_snapshot || o.delivery_address_snapshot?.phone || prof?.phone_number || null,
        },
      }
    })

    return NextResponse.json({
      orders: enrichedOrders,
      pharmacy: {
        id: context.pharmacy.id,
        name: context.pharmacy.name,
        verification_status: context.pharmacy.verification_status,
        status: context.pharmacy.status,
      },
    })
  } catch (err: any) {
    const status = err.status || 500
    return NextResponse.json(
      { error: err.message || 'Failed to fetch pharmacy orders', orders: [] },
      { status }
    )
  }
}
