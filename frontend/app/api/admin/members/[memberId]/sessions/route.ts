import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'

export async function GET(
  request: Request,
  props: { params: Promise<{ memberId: string }> }
) {
  try {
    await assertAdmin(request)

    const { memberId } = await props.params
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('member_id', memberId)
      .order('scheduled_at', { ascending: false })

    if (error) {
      console.warn('[Admin Sessions API]', error.message)
      return NextResponse.json([])
    }

    const safeSessions = (sessions || []).map((s: any) => ({
      id: s.id,
      staff_id: s.staff_id,
      staff_role: s.staff_role,
      session_type: s.session_type,
      status: s.status,
      scheduled_at: s.scheduled_at,
      started_at: s.started_at,
      ended_at: s.ended_at,
      duration_minutes: s.duration_minutes,
      notes_added: s.notes_added,
      created_at: s.created_at,
    }))

    return NextResponse.json(safeSessions)
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message }, { status })
  }
}
