import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)

    const { data, error } = await supabaseAdmin
      .from('assignment_engine_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load assignment settings.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 400)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await assertAdmin(request)
    const body = await request.json()

    const updates = {
      auto_assignment_enabled: body.autoAssignmentEnabled !== false,
      preferred_strategy: body.preferredStrategy || 'LEAST_WORKLOAD',
      fallback_manual_allowed: body.fallbackManualAllowed !== false,
      max_daily_consultations: Number(body.maxDailyConsultations || 12),
      max_hourly_consultations: Number(body.maxHourlyConsultations || 3),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('assignment_engine_settings')
      .upsert({ id: true, ...updates }, { onConflict: 'id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update assignment settings.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 400)
    return NextResponse.json({ error: message }, { status })
  }
}
