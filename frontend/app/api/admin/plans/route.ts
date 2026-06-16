import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

const FALLBACK_PLANS = [
  {
    id: 'silver-fallback',
    name: 'Silver Plan',
    price_monthly: 999.00,
    consultation_fee: 499.00,
    features: ['1:1 Monthly video consultations', 'Pharmacy delivery', 'Prioritized chat', 'GLP-1 prescriptions'],
    is_active: true
  },
  {
    id: 'gold-fallback',
    name: 'Gold Plan',
    price_monthly: 1999.00,
    consultation_fee: 499.00,
    features: ['1:1 Bi-weekly video consultations', 'Pharmacy delivery', '24/7 Priority Chat', 'Dietitian coaching', 'Fitness trainer check-ins', 'Monthly group wellness meets', 'Dedicated Care Coordinator', 'Quarterly blood panel reviews', 'GLP-1 prescriptions'],
    is_active: true
  }
]

export async function GET(request: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })

    if (error) {
      console.warn('Failed to query membership_plans, table may be missing:', error.message)
      return NextResponse.json({ plans: FALLBACK_PLANS, warning: 'Using fallback plans. Run Database/fix_admin.sql' })
    }

    return NextResponse.json({ plans: data && data.length > 0 ? data : FALLBACK_PLANS })
  } catch (err: any) {
    return NextResponse.json({ plans: FALLBACK_PLANS, error: err.message })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { adminId, name, priceMonthly, consultationFee, features, isActive, discountCode, discountPercent } = body

    if (!adminId || !name || !priceMonthly) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify admin role
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    // Upsert plan
    const { error: planErr } = await supabaseAdmin
      .from('membership_plans')
      .upsert({
        name,
        price_monthly: parseFloat(priceMonthly),
        consultation_fee: consultationFee ? parseFloat(consultationFee) : 499.00,
        features: features || [],
        is_active: isActive !== undefined ? isActive : true,
        discount_code: discountCode || null,
        discount_percent: discountPercent ? parseInt(discountPercent) : 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'name' })

    if (planErr) {
      console.error('Database error on membership_plans write:', planErr.message)
      return NextResponse.json({ error: 'Database table membership_plans is missing. Please run Database/fix_admin.sql in your Supabase SQL Editor first!' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API Error in /api/admin/plans:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
