import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'
import { SEED_PLANS, computePlanPricing } from '@/lib/subscriptionService'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)

    const { data: dbPlans, error } = await supabaseAdmin
      .from('treatment_plans')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.warn('Failed to query treatment_plans, returning seed plans:', error.message)
      return NextResponse.json({ plans: SEED_PLANS, isFallback: true })
    }

    return NextResponse.json({ plans: dbPlans && dbPlans.length > 0 ? dbPlans : SEED_PLANS })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await assertAdmin(request)
    const body = await request.json()
    const {
      id,
      name,
      durationMonths,
      basePrice,
      discountPercentage,
      currency = 'INR',
      description,
      features,
      status = 'ACTIVE',
      displayOrder = 0,
      validFrom,
      validUntil,
    } = body

    if (!name || basePrice === undefined || durationMonths === undefined) {
      return NextResponse.json({ error: 'Missing required parameters: name, durationMonths, and basePrice are mandatory.' }, { status: 400 })
    }

    const duration = parseInt(durationMonths)
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json({ error: 'Duration in months must be a positive integer greater than 0.' }, { status: 400 })
    }

    const rawBasePrice = parseFloat(basePrice)
    if (isNaN(rawBasePrice) || rawBasePrice < 0) {
      return NextResponse.json({ error: 'Base price must be a non-negative number.' }, { status: 400 })
    }

    const rawDiscountPct = parseFloat(discountPercentage || 0)
    if (isNaN(rawDiscountPct) || rawDiscountPct < 0 || rawDiscountPct > 100) {
      return NextResponse.json({ error: 'Discount percentage must be between 0 and 100.' }, { status: 400 })
    }

    // Server-authoritative calculation: Never trust client-supplied discountAmount or finalPrice
    const calc = computePlanPricing(rawBasePrice, rawDiscountPct, duration)
    const now = new Date().toISOString()

    let oldValues: Record<string, unknown> | null = null

    if (id) {
      const { data: existing } = await supabaseAdmin
        .from('treatment_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      oldValues = existing || null
    }

    const planPayload = {
      tenant_id: '8liv',
      name: String(name).trim(),
      duration_months: duration,
      base_price: calc.basePrice,
      discount_percentage: calc.discountPercentage,
      discount_amount: calc.discountAmount,
      final_price: calc.finalPrice,
      currency: String(currency).toUpperCase(),
      description: description ? String(description).trim() : null,
      features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split(',').map(f => f.trim()).filter(Boolean) : []),
      status: ['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status) ? status : 'ACTIVE',
      display_order: parseInt(displayOrder) || 0,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      updated_at: now,
      updated_by: adminUser.id,
    }

    let savedPlan: any = null

    if (id) {
      const { data, error: updateErr } = await supabaseAdmin
        .from('treatment_plans')
        .update(planPayload)
        .eq('id', id)
        .select('*')
        .single()

      if (updateErr) throw updateErr
      savedPlan = data

      // Audit Log for Mutation
      await supabaseAdmin.from('plan_audit_logs').insert({
        tenant_id: '8liv',
        admin_user_id: adminUser.id,
        plan_id: id,
        action: 'PLAN_UPDATED',
        old_values: oldValues,
        new_values: savedPlan,
      })
    } else {
      const { data, error: insertErr } = await supabaseAdmin
        .from('treatment_plans')
        .insert({
          ...planPayload,
          created_by: adminUser.id,
          created_at: now,
        })
        .select('*')
        .single()

      if (insertErr) throw insertErr
      savedPlan = data

      // Audit Log for Creation
      await supabaseAdmin.from('plan_audit_logs').insert({
        tenant_id: '8liv',
        admin_user_id: adminUser.id,
        plan_id: savedPlan.id,
        action: 'PLAN_CREATED',
        old_values: null,
        new_values: savedPlan,
      })
    }

    return NextResponse.json({ success: true, plan: savedPlan })
  } catch (err: any) {
    console.error('API Error in /api/admin/plans:', err)
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await assertAdmin(request)
    const body = await request.json()
    const { id, status } = body

    if (!id || !status || !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      return NextResponse.json({ error: 'Valid plan ID and status (ACTIVE/INACTIVE/ARCHIVED) are required.' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('treatment_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    const { data: updated, error } = await supabaseAdmin
      .from('treatment_plans')
      .update({ status, updated_at: new Date().toISOString(), updated_by: adminUser.id })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    await supabaseAdmin.from('plan_audit_logs').insert({
      tenant_id: '8liv',
      admin_user_id: adminUser.id,
      plan_id: id,
      action: status === 'ACTIVE' ? 'PLAN_ACTIVATED' : 'PLAN_DEACTIVATED',
      old_values: existing,
      new_values: updated,
    })

    return NextResponse.json({ success: true, plan: updated })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}
