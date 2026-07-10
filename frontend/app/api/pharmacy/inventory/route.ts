import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyAccess, logPharmacyAudit, parsePagination } from '@/lib/pharmacy'

export async function GET(request: Request) {
  try {
    await assertPharmacyAccess(request)
    const { params, from, to, page, limit } = parsePagination(request.url)
    const search = params.get('search')?.trim()
    const status = params.get('status')

    let query = supabaseAdmin
      .from('medicine_inventory')
      .select('*, medicine_batches(*)', { count: 'exact' })
      .order('name', { ascending: true })

    if (search) query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,brand.ilike.%${search}%,manufacturer.ilike.%${search}%`)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query.range(from, to)
    if (error) throw error

    return NextResponse.json({
      medicines: data || [],
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
    const auth = await assertPharmacyAccess(request, ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'ADMIN'])
    const body = await request.json().catch(() => ({}))
    const required = ['name', 'batchNumber', 'expiryDate', 'sellingPrice', 'currentStock', 'minimumStock']
    const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
    if (missing.length) return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 })

    const now = new Date().toISOString()
    const medicinePayload = {
      pharmacy_id: auth.pharmacyId,
      name: body.name,
      generic_name: body.genericName || null,
      brand: body.brand || null,
      manufacturer: body.manufacturer || null,
      category: body.category || null,
      strength: body.strength || null,
      purchase_price: Number(body.purchasePrice || 0),
      selling_price: Number(body.sellingPrice || 0),
      current_stock: Number(body.currentStock || 0),
      minimum_stock: Number(body.minimumStock || 0),
      maximum_stock: Number(body.maximumStock || 0),
      status: body.status || 'ACTIVE',
      updated_at: now,
    }

    const { data: medicine, error: medError } = await supabaseAdmin
      .from('medicine_inventory')
      .insert(medicinePayload)
      .select('*')
      .single()
    if (medError) throw medError

    const { error: batchError } = await supabaseAdmin
      .from('medicine_batches')
      .insert({
        medicine_id: medicine.id,
        pharmacy_id: auth.pharmacyId,
        batch_number: body.batchNumber,
        expiry_date: body.expiryDate,
        quantity_received: Number(body.currentStock || 0),
        quantity_available: Number(body.currentStock || 0),
        purchase_price: Number(body.purchasePrice || 0),
        selling_price: Number(body.sellingPrice || 0),
        status: 'ACTIVE',
      })
    if (batchError) throw batchError

    await supabaseAdmin.from('medicine_stock_logs').insert({
      medicine_id: medicine.id,
      pharmacy_id: auth.pharmacyId,
      actor_id: auth.user.id,
      actor_role: auth.role,
      adjustment_type: 'INITIAL_STOCK',
      quantity_delta: Number(body.currentStock || 0),
      stock_before: 0,
      stock_after: Number(body.currentStock || 0),
      reason: 'Medicine created',
    })

    await logPharmacyAudit({
      actorId: auth.user.id,
      actorRole: auth.role,
      action: 'INVENTORY_CREATED',
      targetType: 'medicine_inventory',
      targetId: medicine.id,
      pharmacyId: auth.pharmacyId,
      request,
    })

    return NextResponse.json({ medicine }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await assertPharmacyAccess(request, ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'ADMIN'])
    const body = await request.json().catch(() => ({}))
    const { medicineId, adjustmentQuantity, reason, ...updates } = body
    if (!medicineId) return NextResponse.json({ error: 'medicineId is required.' }, { status: 400 })

    const { data: current, error: lookupError } = await supabaseAdmin
      .from('medicine_inventory')
      .select('*')
      .eq('id', medicineId)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (!current) return NextResponse.json({ error: 'Medicine not found.' }, { status: 404 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value
    }

    if (adjustmentQuantity !== undefined) {
      patch.current_stock = Number(current.current_stock || 0) + Number(adjustmentQuantity || 0)
    }

    const { data: medicine, error: updateError } = await supabaseAdmin
      .from('medicine_inventory')
      .update(patch)
      .eq('id', medicineId)
      .select('*')
      .single()
    if (updateError) throw updateError

    if (adjustmentQuantity !== undefined) {
      await supabaseAdmin.from('medicine_stock_logs').insert({
        medicine_id: medicineId,
        pharmacy_id: auth.pharmacyId,
        actor_id: auth.user.id,
        actor_role: auth.role,
        adjustment_type: Number(adjustmentQuantity) >= 0 ? 'INCREASE' : 'DECREASE',
        quantity_delta: Number(adjustmentQuantity || 0),
        stock_before: Number(current.current_stock || 0),
        stock_after: Number(medicine.current_stock || 0),
        reason: reason || 'Manual stock adjustment',
      })
    }

    await logPharmacyAudit({
      actorId: auth.user.id,
      actorRole: auth.role,
      action: adjustmentQuantity !== undefined ? 'STOCK_ADJUSTED' : 'INVENTORY_UPDATED',
      targetType: 'medicine_inventory',
      targetId: medicineId,
      pharmacyId: auth.pharmacyId,
      metadata: { adjustmentQuantity, reason },
      request,
    })

    return NextResponse.json({ medicine })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
