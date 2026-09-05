import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertDoctor, errorResponse } from '@/lib/fulfilmentAuth'
import { createPrescription, signPrescription, validatePrescriptionInput } from '@/lib/prescriptionService'

export async function GET(request: Request) {
  try {
    const auth = await assertDoctor(request)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')?.trim()

    let query = supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*), pharmacy_orders(*)')
      .eq('doctor_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('prescription_number', `%${search}%`)
    }

    const { data: prescriptions, error: rxError } = await query
    if (rxError) throw rxError

    const list = prescriptions || []
    const patientIds = Array.from(new Set(list.map((rx: any) => rx.patient_id).filter(Boolean)))
    const consultationIds = Array.from(new Set(list.map((rx: any) => rx.consultation_id).filter(Boolean)))

    let patientsMap = new Map()
    let consultationsMap = new Map()

    if (patientIds.length > 0) {
      try {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name, full_name, email, phone_number, display_id')
          .in('id', patientIds)
        if (profiles) {
          patientsMap = new Map(profiles.map((p: any) => [p.id, p]))
        }
      } catch (pErr) {
        console.warn('[doctor/prescriptions] Profiles fetch warning:', pErr)
      }
    }

    if (consultationIds.length > 0) {
      try {
        const { data: consults } = await supabaseAdmin
          .from('doctor_consultations')
          .select('id, booking_date, booking_time, status, appointment_type')
          .in('id', consultationIds)
        if (consults) {
          consultationsMap = new Map(consults.map((c: any) => [c.id, c]))
        }
      } catch (cErr) {
        console.warn('[doctor/prescriptions] Consultations fetch warning:', cErr)
      }
    }

    const enriched = list.map((rx: any) => {
      const patient = patientsMap.get(rx.patient_id) || null
      const consultation = consultationsMap.get(rx.consultation_id) || null
      return {
        ...rx,
        patient,
        patient_name: patient
          ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.full_name || patient.email
          : 'Patient',
        consultation,
      }
    })

    // If search was specified and did not match prescription number, filter by patient name in memory
    const finalResults = search
      ? enriched.filter(
          (rx: any) =>
            rx.prescription_number?.toLowerCase().includes(search.toLowerCase()) ||
            rx.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
            rx.diagnosis?.toLowerCase().includes(search.toLowerCase())
        )
      : enriched

    return NextResponse.json({ prescriptions: finalResults })
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error, prescriptions: [] }, { status: failure.status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertDoctor(request)
    const body = await request.json().catch(() => ({}))

    const consultationId = body.consultationId || body.consultation_id || ''
    const patientId = body.patientId || body.patient_id || ''
    const autoSign = Boolean(body.autoSign || body.signNow)

    const input = validatePrescriptionInput({
      diagnosis: body.diagnosis,
      valid_until: body.valid_until || body.validUntil,
      items: body.items,
    })

    // 1. Create prescription draft
    const prescription = await createPrescription(consultationId, auth.user.id, input, { patientId })

    // 2. Auto-sign if requested
    let finalPrescription = prescription
    let signedResult: any = null

    if (autoSign) {
      signedResult = await signPrescription(prescription.id, auth.user.id)
      finalPrescription = signedResult.prescription || prescription
    }

    return NextResponse.json(
      {
        success: true,
        prescription: finalPrescription,
        isSigned: autoSign,
        alreadySigned: signedResult?.alreadySigned || false,
      },
      { status: 201 }
    )
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
