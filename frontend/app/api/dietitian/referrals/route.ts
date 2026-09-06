import { NextResponse } from 'next/server'
import { getAuthenticatedUser, assertDietitian, resolveTenant } from '@/lib/apiSecurity'
import { createDoctorReferral } from '@/lib/nutritionService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('dietitian_referrals')
      .select('*, patient:patient_id(id, full_name, email, age, gender), doctor:doctor_id(id, full_name)')
      .or(`dietitian_id.eq.${auth.user.id},dietitian_id.is.null`)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: true, referrals: [] })
    }

    return NextResponse.json({ success: true, referrals: data || [] })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch referrals' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Doctor or Admin can create referrals
    if (auth.role !== 'doctor' && auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Only doctors can create clinical nutrition referrals.' }, { status: 403 })
    }

    const tenantId = resolveTenant(request, auth.user)
    const body = await request.json()

    if (!body.patient_id || !body.reason) {
      return NextResponse.json({ success: false, error: 'Patient ID and referral reason are required' }, { status: 400 })
    }

    const referral = await createDoctorReferral(
      auth.user.id,
      {
        patient_id: body.patient_id,
        dietitian_id: body.dietitian_id || null,
        reason: body.reason,
        priority: body.priority || 'ROUTINE',
        clinical_notes: body.clinical_notes || null,
      },
      tenantId,
      request
    )

    return NextResponse.json({ success: true, referral })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to create referral' }, { status: 500 })
  }
}
