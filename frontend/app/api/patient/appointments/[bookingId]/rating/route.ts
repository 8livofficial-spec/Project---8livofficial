import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { APP_CONFIG } from '@/lib/appConfig'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'

type RouteContext = { params: Promise<{ bookingId: string }> }

const completedStatuses = ['approved', 'rejected', 'completed']

async function getCompletedConsultation(bookingId: string, patientId: string) {
  const { data, error } = await supabaseAdmin
    .from('doctor_consultations')
    .select('id, patient_id, doctor_id, status')
    .eq('id', bookingId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) throw error
  return data
}

function ratingTableUnavailable(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || String(error?.message || '').includes('doctor_consultation_ratings')
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const patient = await getAuthenticatedPatient(request)
    if ('error' in patient) return NextResponse.json({ error: patient.error }, { status: patient.status })

    const { bookingId } = await context.params
    const consultation = await getCompletedConsultation(bookingId, patient.user.id)
    if (!consultation) return NextResponse.json({ error: 'Consultation not found.' }, { status: 404 })
    const statusLower = String(consultation.status || '').toLowerCase()
    if (!completedStatuses.includes(statusLower)) {
      return NextResponse.json({ rating: null, canRate: false })
    }

    const { data, error } = await supabaseAdmin
      .from('doctor_consultation_ratings')
      .select('rating, review, created_at, updated_at')
      .eq('consultation_id', bookingId)
      .eq('patient_id', patient.user.id)
      .maybeSingle()

    if (error) {
      if (ratingTableUnavailable(error)) return NextResponse.json({ error: 'Ratings are not configured yet.' }, { status: 503 })
      throw error
    }
    return NextResponse.json({ rating: data || null, canRate: Boolean(consultation.doctor_id) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load consultation rating.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const patient = await getAuthenticatedPatient(request)
    if ('error' in patient) return NextResponse.json({ error: patient.error }, { status: patient.status })

    // Rate Limiting
    const ip = getClientIp(request)
    const rate = checkRateLimit(`rating:${ip}:${patient.user.id}`, APP_CONFIG.rateLimits.ratings)
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfter || 60, rate.message)
    }

    const { bookingId } = await context.params
    const consultation = await getCompletedConsultation(bookingId, patient.user.id)
    if (!consultation) return NextResponse.json({ error: 'Consultation not found.' }, { status: 404 })
    if (!completedStatuses.includes(String(consultation.status || '').toLowerCase())) {
      return NextResponse.json({ error: 'The consultation must be completed before it can be rated.' }, { status: 409 })
    }
    if (!consultation.doctor_id) return NextResponse.json({ error: 'This consultation has no assigned doctor.' }, { status: 409 })

    if (patient.user.id === consultation.doctor_id) {
      return NextResponse.json({ error: 'Self-rating is not allowed.' }, { status: 400 })
    }

    const body = await request.json()
    const rating = Number(body.rating)
    const review = String(body.review || '').trim()
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Choose a rating between 1 and 5.' }, { status: 400 })
    }
    if (review.length > 1000) return NextResponse.json({ error: 'Review must be 1000 characters or fewer.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('doctor_consultation_ratings')
      .upsert({
        consultation_id: bookingId,
        patient_id: patient.user.id,
        doctor_id: consultation.doctor_id,
        rating,
        review: review || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'consultation_id' })
      .select('rating, review, created_at, updated_at')
      .single()

    if (error) {
      if (ratingTableUnavailable(error)) return NextResponse.json({ error: 'Ratings are not configured yet.' }, { status: 503 })
      throw error
    }
    return NextResponse.json({ rating: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to save consultation rating.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

