import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Patient can only view their own nutrition plans from both nutrition_plans and diet_plans
    const [{ data: formalPlans }, { data: assignedDietPlans }] = await Promise.all([
      supabaseAdmin
        .from('nutrition_plans')
        .select('*, dietitian:dietitian_id(full_name)')
        .eq('patient_id', auth.user.id)
        .order('version', { ascending: false }),
      supabaseAdmin
        .from('diet_plans')
        .select('*')
        .eq('patient_id', auth.user.id)
        .order('created_at', { ascending: false })
    ])

    // Fetch dietitian names for diet_plans
    const dietitianIds = Array.from(new Set((assignedDietPlans || []).map((dp: any) => dp.dietitian_id).filter(Boolean)))
    const dietitianNameMap = new Map()
    if (dietitianIds.length > 0) {
      const { data: dProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, full_name')
        .in('id', dietitianIds)
      for (const d of dProfiles || []) {
        dietitianNameMap.set(d.id, d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Clinical Dietitian')
      }
    }

    const mappedDietPlans = await Promise.all((assignedDietPlans || []).map(async (dp: any) => {
      let attachment_signed_url = null
      if (dp.attachment_url) {
        try {
          const rawPath = String(dp.attachment_url).replace(/^diet-plans\//, '')
          const { data: signed } = await supabaseAdmin.storage
            .from('diet-plans')
            .createSignedUrl(rawPath, 3600 * 24)
          if (signed?.signedUrl) attachment_signed_url = signed.signedUrl
        } catch (e) {
          console.warn('Diet plan signed URL warning:', e)
        }
      }
      return {
        id: dp.id,
        plan_name: dp.title || 'Personalized Clinical Nutrition Plan',
        version: 1,
        status: (dp.status || 'ACTIVE').toUpperCase(),
        start_date: dp.created_at ? new Date(dp.created_at).toISOString().split('T')[0] : 'Today',
        review_date: 'In 14 Days',
        daily_calorie_target: dp.calories_per_day || 1600,
        calories_per_day: dp.calories_per_day || 1600,
        water_target_liters: dp.hydration_goal ? parseFloat(dp.hydration_goal) : 2.5,
        hydration_goal: dp.hydration_goal || '2.5 L',
        general_instructions: dp.description || dp.notes || 'Follow personalized clinical schedule',
        notes: dp.notes || dp.description || null,
        meal_schedule: dp.meal_schedule || null,
        meals: dp.meals || (dp.meal_schedule ? [{ meal_name: 'Custom Diet', items: [dp.meal_schedule] }] : []),
        attachment_url: dp.attachment_url || null,
        attachment_type: dp.attachment_type || null,
        attachment_signed_url,
        dietitian: { full_name: dietitianNameMap.get(dp.dietitian_id) || 'Clinical Dietitian (RD)' },
        created_at: dp.created_at,
      }
    }))

    const mappedFormalPlans = await Promise.all((formalPlans || []).map(async (p: any) => {
      let attachment_signed_url = null
      if (p.pdf_url) {
        try {
          const rawPath = String(p.pdf_url).replace(/^diet-plans\//, '')
          const { data: signed } = await supabaseAdmin.storage
            .from('diet-plans')
            .createSignedUrl(rawPath, 3600 * 24)
          if (signed?.signedUrl) attachment_signed_url = signed.signedUrl
        } catch (e) {
          console.warn('PDF signed URL warning:', e)
        }
      }
      return {
        ...p,
        status: (p.status || 'PUBLISHED').toUpperCase(),
        attachment_signed_url,
      }
    }))

    const allPlans = [...mappedFormalPlans, ...mappedDietPlans].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const activePlan = allPlans.find(
      (p: any) => ['PUBLISHED', 'ACKNOWLEDGED', 'ACTIVE'].includes(String(p.status).toUpperCase())
    ) || allPlans[0] || null

    return NextResponse.json({
      success: true,
      plans: allPlans,
      activePlan,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch patient nutrition plans' }, { status: 500 })
  }
}
