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

    // Tenant / Pharmacy isolation:
    // If not admin, only fetch orders explicitly assigned to this pharmacy OR unassigned pending orders
    if (!context.isAdmin) {
      query = query.or(`pharmacy_id.eq.${context.pharmacy.id},pharmacy_id.is.null`)
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`apollo_order_reference.ilike.%${search}%,tracking_number.ilike.%${search}%`)
    }

    const { data: orders, error } = await query.limit(100)

    if (error) {
      console.warn('[api/pharmacy/orders] Error fetching orders:', error.message)
      return NextResponse.json({ error: error.message, orders: [] }, { status: 500 })
    }

    return NextResponse.json({
      orders: orders || [],
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
