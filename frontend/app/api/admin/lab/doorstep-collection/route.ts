import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { WhatsAppNotificationService } from '@/lib/whatsapp/whatsappNotificationService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    await assertAdmin(request)

    const body = await request.json().catch(() => ({}))
    const { patientId, address, date, startTime, endTime, collectionId } = body

    if (!patientId || !address || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'patientId, address, date, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, phone_number')
      .eq('id', patientId)
      .maybeSingle()

    if (error || !profile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const phone = profile.phone_number
    if (!phone) {
      return NextResponse.json({ error: 'Patient does not have a phone number on file' }, { status: 400 })
    }

    const patientName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Patient'

    const enqueued = await WhatsAppNotificationService.sendLabDoorstepCollection(phone, {
      patientName,
      address,
      date,
      startTime,
      endTime,
      collectionId: collectionId || `lab_${Date.now()}`,
    })

    return NextResponse.json({
      success: enqueued,
      message: 'Lab doorstep collection notification enqueued for WhatsApp delivery.',
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}
