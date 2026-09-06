import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', logs: [] }, { status: 401 })
    }

    const { data: logs, error } = await supabaseAdmin
      .from('progress_logs')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('Error fetching progress logs:', error.message)
      return NextResponse.json({ logs: [] })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, logs: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const weightKg = parseFloat(body.weight_kg || body.weight)
    if (isNaN(weightKg) || weightKg <= 0) {
      return NextResponse.json({ error: 'Valid weight in kg is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('progress_logs')
      .insert({
        user_id: auth.user.id,
        weight_kg: weightKg,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    // Also record patient notification
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: auth.user.id,
        type: 'progress',
        title: 'Weight Logged',
        message: `Logged daily weight of ${weightKg} kg.`,
        is_read: false,
      })

    return NextResponse.json({ success: true, log: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to log weight' }, { status: 500 })
  }
}
