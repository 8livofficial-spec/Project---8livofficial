import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const params = new URL(request.url).searchParams
    const search = params.get('search')?.trim()
    const status = params.get('status')?.trim()
    let query = supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*), pharmacy_orders(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (status) query = query.eq('status', status)
    if (search) query = query.ilike('prescription_number', `%${search}%`)
    const { data, error } = await query
    if (error) throw error

    const prescriptions = data || []
    const patientIds = Array.from(new Set(prescriptions.map((rx: any) => rx.patient_id).filter(Boolean)))
    const doctorIds = Array.from(new Set(prescriptions.map((rx: any) => rx.doctor_id).filter(Boolean)))

    const [patientsRes, doctorsRes] = await Promise.all([
      patientIds.length
        ? supabaseAdmin.from('profiles').select('id, first_name, last_name, email, phone_number').in('id', patientIds)
        : Promise.resolve({ data: [], error: null }),
      doctorIds.length
        ? supabaseAdmin.from('doctor_profiles').select('id, full_name, registration_number').in('id', doctorIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (patientsRes.error) throw patientsRes.error
    if (doctorsRes.error) throw doctorsRes.error

    const patients = new Map((patientsRes.data || []).map((patient: any) => [patient.id, patient]))
    const doctors = new Map((doctorsRes.data || []).map((doctor: any) => [doctor.id, doctor]))

    return NextResponse.json({
      prescriptions: prescriptions.map((rx: any) => ({
        ...rx,
        patient: patients.get(rx.patient_id) || null,
        doctor: doctors.get(rx.doctor_id) || null,
      })),
    })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
