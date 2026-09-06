import { NextResponse } from 'next/server'
import { assertDietitian } from '@/lib/apiSecurity'
import { getNutritionPlanTemplates } from '@/lib/nutritionService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    await assertDietitian(request)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    const templates = await getNutritionPlanTemplates(category)
    return NextResponse.json({ success: true, templates })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch templates' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const body = await request.json()

    if (!body.name || !body.category) {
      return NextResponse.json({ success: false, error: 'Name and category are required' }, { status: 400 })
    }

    const templateData = {
      tenant_id: '8liv',
      dietitian_id: auth.user.id,
      name: body.name,
      category: body.category,
      description: body.description || null,
      target_calories: body.target_calories ? Number(body.target_calories) : null,
      water_target_liters: body.water_target_liters ? Number(body.water_target_liters) : 2.5,
      meals: body.meals || [],
      instructions: body.instructions || null,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('nutrition_plan_templates')
      .insert(templateData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: true, template: templateData })
    }

    return NextResponse.json({ success: true, template: data })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to create template' }, { status })
  }
}
