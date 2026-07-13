import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatientOrAssignedProvider } from '@/lib/apiSecurity'
import { ensureMembershipExpiryNotification } from '@/lib/membershipServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

    await assertPatientOrAssignedProvider(request, patientId)
    await ensureMembershipExpiryNotification(patientId)

    const { data, error } = await supabaseAdmin
      .from('patient_notifications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notifications: data || [] })
  } catch (err: unknown) {
    console.error('API Error in GET /api/patient/notifications:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { patientId, notificationId, markAll } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

    await assertPatientOrAssignedProvider(request, patientId)

    if (markAll) {
      // Mark all notifications for this patient as read
      const { error } = await supabaseAdmin
        .from('patient_notifications')
        .update({ is_read: true })
        .eq('patient_id', patientId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (notificationId) {
      // Mark specific notification as read
      const { error } = await supabaseAdmin
        .from('patient_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('patient_id', patientId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Missing notificationId or markAll flag' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    console.error('API Error in /api/patient/notifications:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
