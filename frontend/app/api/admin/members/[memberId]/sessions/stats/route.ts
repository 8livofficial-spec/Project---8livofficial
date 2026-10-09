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
      .select('status')
      .eq('member_id', memberId)

    if (error) {
      console.warn('[Admin Sessions Stats]', error.message)
    }

    const rows = sessions || []
    const stats = {
      total: rows.length,
      completed: 0,
      missed: 0,
      cancelled: 0,
      upcoming: 0,
      in_progress: 0,
      completion_rate: 0
    }

    for (const s of rows) {
      const status = s.status
      if (status === 'completed') stats.completed++
      else if (status === 'missed') stats.missed++
      else if (status === 'cancelled') stats.cancelled++
      else if (status === 'scheduled') stats.upcoming++
      else if (status === 'in_progress') stats.in_progress++
    }

    if (stats.total > 0) {
      stats.completion_rate = Math.round((stats.completed / stats.total) * 100)
    }

    return NextResponse.json(stats)
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message }, { status })
  }
}
