import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'
import { logPharmacyAudit, parsePagination } from '@/lib/pharmacy'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const { from, to, page, limit } = parsePagination(request.url)
    const [{ data: pharmacies, error, count }, { data: users }, { data: partners }, { data: revenue }] = await Promise.all([
      supabaseAdmin.from('pharmacies').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to),
      supabaseAdmin.from('pharmacy_users').select('*').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('delivery_partners').select('*').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('prescription_orders').select('status,total_amount').limit(1000),
    ])
    if (error) throw error

    return NextResponse.json({
      pharmacies: pharmacies || [],
      pharmacyUsers: users || [],
      deliveryPartners: partners || [],
      summary: {
        totalRevenue: (revenue || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
        refundRequests: (revenue || []).filter((row) => row.status === 'REFUNDED').length,
        activeOrders: (revenue || []).filter((row) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(row.status)).length,
      },
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const body = await request.json().catch(() => ({}))
    const { name, licenseNumber, contactEmail, contactPhone, address } = body
    if (!name || !licenseNumber) return NextResponse.json({ error: 'name and licenseNumber are required.' }, { status: 400 })

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .insert({
        name,
        license_number: licenseNumber,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        address: address || {},
        status: 'PENDING_APPROVAL',
      })
      .select('*')
      .single()
    if (error) throw error

    await logPharmacyAudit({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: 'PHARMACY_CREATED',
      targetType: 'pharmacy',
      targetId: pharmacy.id,
      request,
    })
    return NextResponse.json({ pharmacy }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const body = await request.json().catch(() => ({}))
    const { pharmacyId, status: pharmacyStatus, refundOrderId, refundId } = body
    if (!pharmacyId && !refundOrderId) return NextResponse.json({ error: 'pharmacyId or refundOrderId is required.' }, { status: 400 })

    if (refundOrderId) {
      const { data: order, error } = await supabaseAdmin
        .from('prescription_orders')
        .update({ status: 'REFUNDED', refund_id: refundId || null, refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', refundOrderId)
        .select('*')
        .single()
      if (error) throw error
      await logPharmacyAudit({ actorId: admin.id, actorRole: 'ADMIN', action: 'ORDER_REFUNDED', targetType: 'prescription_order', targetId: refundOrderId, request })
      return NextResponse.json({ order })
    }

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .update({ status: pharmacyStatus, approved_at: pharmacyStatus === 'APPROVED' ? new Date().toISOString() : undefined, updated_at: new Date().toISOString() })
      .eq('id', pharmacyId)
      .select('*')
      .single()
    if (error) throw error

    await logPharmacyAudit({ actorId: admin.id, actorRole: 'ADMIN', action: 'PHARMACY_STATUS_UPDATED', targetType: 'pharmacy', targetId: pharmacyId, metadata: { pharmacyStatus }, request })
    return NextResponse.json({ pharmacy })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
