import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyAccess } from '@/lib/pharmacy'

export async function GET(request: Request) {
  try {
    const auth = await assertPharmacyAccess(request)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    const [ordersRes, lowStockRes, expiringRes, alertsRes] = await Promise.all([
      supabaseAdmin
        .from('prescription_orders')
        .select('id, status, total_amount, created_at')
        .gte('created_at', todayIso),
      supabaseAdmin
        .from('medicine_inventory')
        .select('id, name, current_stock, minimum_stock, status')
        .eq('status', 'ACTIVE')
        .lte('current_stock', 10)
        .limit(10),
      supabaseAdmin
        .from('medicine_batches')
        .select('id, medicine_id, batch_number, expiry_date, quantity_available')
        .gte('expiry_date', new Date().toISOString().slice(0, 10))
        .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('expiry_date', { ascending: true })
        .limit(10),
      supabaseAdmin
        .from('inventory_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (ordersRes.error) throw ordersRes.error
    if (lowStockRes.error) throw lowStockRes.error
    if (expiringRes.error) throw expiringRes.error
    if (alertsRes.error) throw alertsRes.error

    const orders = ordersRes.data || []
    const countByStatus = (status: string) => orders.filter((order) => order.status === status).length

    return NextResponse.json({
      role: auth.role,
      pharmacyId: auth.pharmacyId,
      summary: {
        todaysOrders: orders.length,
        pendingVerification: countByStatus('ORDER_PLACED') + countByStatus('PAYMENT_COMPLETED'),
        preparingOrders: countByStatus('PREPARING'),
        packedOrders: countByStatus('PACKED') + countByStatus('READY_FOR_DISPATCH'),
        outForDelivery: countByStatus('OUT_FOR_DELIVERY'),
        delivered: countByStatus('DELIVERED'),
        cancelled: countByStatus('CANCELLED'),
        revenue: orders
          .filter((order) => ['PAYMENT_COMPLETED', 'PHARMACY_ACCEPTED', 'PREPARING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status))
          .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        inventoryAlerts: alertsRes.data?.length || 0,
      },
      lowStockMedicines: lowStockRes.data || [],
      expiringMedicines: expiringRes.data || [],
      alerts: alertsRes.data || [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
