import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

async function assertAdmin(adminId?: string | null) {
  if (!adminId) throw new Error('Missing adminId')
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle()
  if (data?.role !== 'admin') throw new Error('Unauthorized')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    await assertAdmin(searchParams.get('adminId'))

    const { data, error } = await supabaseAdmin
      .from('assignment_engine_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load assignment settings.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 403 : 400 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    await assertAdmin(body.adminId)

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
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 403 : 400 })
  }
}
