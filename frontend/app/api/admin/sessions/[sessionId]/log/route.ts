import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'

export async function GET(
  request: Request,
  props: { params: Promise<{ sessionId: string }> }
) {
  try {
    await assertAdmin(request)

    const { sessionId } = await props.params
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const { data: logs, error } = await supabaseAdmin
      .from('session_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })

    if (error) {
      return NextResponse.json([])
    }

    const formatted = (logs || []).map((log: any) => ({
      id: log.id,
      event: log.event,
      triggered_by: log.triggered_by,
      metadata: log.metadata_ || log.metadata,
      timestamp: log.timestamp || log.created_at
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message }, { status })
  }
}
