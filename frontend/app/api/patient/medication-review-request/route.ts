import { NextResponse } from 'next/server'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'
import { requestPatientMedicationReview } from '@/lib/treatmentCycleService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const auth = await assertPatient(request)
    const body = await request.json()

    const notes = String(body.notes || '').trim()
    if (!notes) {
      return NextResponse.json(
        { error: 'Please describe your request, symptoms, or concerns for your doctor.' },
        { status: 400 }
      )
    }

    // Determine assigned doctor if not provided
    let doctorId = body.doctor_id || body.doctorId || null
    if (!doctorId) {
      const { data: booking } = await supabaseAdmin
        .from('doctor_consultations')
        .select('doctor_id')
        .eq('patient_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (booking?.doctor_id) {
        doctorId = booking.doctor_id
      }
    }

    const reviewRequest = await requestPatientMedicationReview({
      patientId: auth.user.id,
      notes,
      doctorId,
    })

    return NextResponse.json({
      success: true,
      message: 'Your medication review request has been sent to your doctor.',
      reviewRequest,
    })
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
