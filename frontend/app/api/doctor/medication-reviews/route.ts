import { NextResponse } from 'next/server'
import { assertDoctor, errorResponse } from '@/lib/fulfilmentAuth'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { audit } from '@/lib/prescriptionService'

export async function GET(request: Request) {
  try {
    const auth = await assertDoctor(request)

    const { data: reviews, error } = await supabaseAdmin
      .from('medication_review_requests')
      .select('*, treatment_cycles(cycle_number, status, start_date, end_date), profiles:patient_id(first_name, last_name, email, phone_number)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ reviews: reviews || [] })
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await assertDoctor(request)
    const body = await request.json()

    const reviewId = body.id || body.reviewId
    const status = (body.status || 'COMPLETED').toUpperCase()
    const doctorNotes = body.doctor_notes || body.doctorNotes || ''

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required.' }, { status: 400 })
    }

    if (!['UNDER_REVIEW', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('medication_review_requests')
      .update({
        status,
        doctor_id: auth.user.id,
        doctor_notes: doctorNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('*')
      .single()

    if (error) throw error

    await audit({
      actorId: auth.user.id,
      actorRole: 'doctor',
      action: `MEDICATION_REVIEW_${status}`,
      newValues: { reviewId, status, doctorNotes },
      request,
    })

    // Notify patient
    if (updated?.patient_id) {
      await supabaseAdmin.from('patient_notifications').insert({
        patient_id: updated.patient_id,
        type: 'clinical',
        title: 'Medication Review Updated',
        message: status === 'COMPLETED' 
          ? 'Your doctor has completed the review of your treatment protocol.'
          : 'Your doctor is currently reviewing your medication feedback.',
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, review: updated })
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
