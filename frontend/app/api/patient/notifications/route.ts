import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { patientId, notificationId, markAll } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

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

  } catch (err: any) {
    console.error('API Error in /api/patient/notifications:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
