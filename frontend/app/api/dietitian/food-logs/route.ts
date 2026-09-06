import { NextResponse } from 'next/server'
import { assertDietitian, assertDietitianPatientAccess } from '@/lib/apiSecurity'
import { reviewFoodLog } from '@/lib/nutritionService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const filter = searchParams.get('filter')

    let query = supabaseAdmin
      .from('food_logs')
      .select('*, profiles:patient_id(full_name, email)')
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (patientId) {
      await assertDietitianPatientAccess(request, patientId)
      query = query.eq('patient_id', patientId)
    }
    if (filter === 'unreviewed') {
      query = query.eq('dietitian_reviewed', false)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: true, foodLogs: [] })
    }

    return NextResponse.json({ success: true, foodLogs: data || [] })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch food logs' }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const body = await request.json()

    if (!body.foodLogId || !body.comment) {
      return NextResponse.json({ success: false, error: 'Food log ID and comment are required' }, { status: 400 })
    }

    const updated = await reviewFoodLog(body.foodLogId, auth.user.id, body.comment, request)
    return NextResponse.json({ success: true, foodLog: updated })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to review food log' }, { status })
  }
}
