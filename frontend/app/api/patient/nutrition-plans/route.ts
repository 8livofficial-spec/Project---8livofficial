import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Patient can only view their own nutrition plans
    const { data: plans, error } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*, dietitian:dietitian_id(full_name)')
      .eq('patient_id', auth.user.id)
      .in('status', ['PUBLISHED', 'ACKNOWLEDGED'])
      .order('version', { ascending: false })

    if (error) {
      return NextResponse.json({ success: true, plans: [] })
    }

    const activePlan = plans?.find((p: any) => p.status === 'PUBLISHED' || p.status === 'ACKNOWLEDGED') || null

    return NextResponse.json({
      success: true,
      plans: plans || [],
      activePlan,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch patient nutrition plans' }, { status: 500 })
  }
}
