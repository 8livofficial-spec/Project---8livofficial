import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('progress_logs')
      .select('user_id, weight_kg, calories, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ logs: data || [] })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load patient logs.' }, { status })
  }
}
