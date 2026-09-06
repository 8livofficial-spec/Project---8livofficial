import { NextResponse } from 'next/server'
import { getAuthenticatedUser, resolveTenant } from '@/lib/apiSecurity'
import { submitFoodLog } from '@/lib/nutritionService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const logDate = searchParams.get('date')

    let query = supabaseAdmin
      .from('food_logs')
      .select('*')
      .eq('patient_id', auth.user.id)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)

    if (logDate) {
      query = query.eq('log_date', logDate)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: true, foodLogs: [] })
    }

    return NextResponse.json({ success: true, foodLogs: data || [] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch food logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = resolveTenant(request, auth.user)
    const body = await request.json()

    if (!body.meal_type) {
      return NextResponse.json({ success: false, error: 'Meal type is required' }, { status: 400 })
    }

    const validMealTypes = ['BREAKFAST', 'MID_MORNING', 'LUNCH', 'EVENING_SNACK', 'DINNER', 'WATER', 'OTHER']
    if (!validMealTypes.includes(body.meal_type)) {
      return NextResponse.json({ success: false, error: 'Invalid meal type' }, { status: 400 })
    }

    const saved = await submitFoodLog(
      auth.user.id,
      {
        log_date: body.log_date,
        meal_type: body.meal_type,
        time: body.time,
        food_items: body.food_items,
        portion: body.portion,
        water_liters: body.water_liters ? Number(body.water_liters) : undefined,
        notes: body.notes,
        completed: body.completed !== undefined ? body.completed : true,
      },
      tenantId,
      request
    )

    return NextResponse.json({ success: true, foodLog: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to save food log' }, { status: 500 })
  }
}
