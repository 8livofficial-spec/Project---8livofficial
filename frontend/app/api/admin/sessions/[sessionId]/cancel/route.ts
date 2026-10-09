import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'

export async function POST(
  request: Request,
  props: { params: Promise<{ sessionId: string }> }
) {
  try {
    await assertAdmin(request)

    const { sessionId } = await props.params
    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || 'Admin Cancelled').trim()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await supabaseAdmin
        .from('session_logs')
        .insert({
          session_id: sessionId,
          event: 'cancelled',
          triggered_by: 'admin',
          metadata_: { reason }
        })
    } catch {
      // Ignore if session_logs is optional
    }

    return NextResponse.json({ status: 'success' })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err?.message || 'Failed to cancel session' }, { status })
  }
}
