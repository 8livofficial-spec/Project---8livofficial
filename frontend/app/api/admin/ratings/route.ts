import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

async function getAuthenticatedAdmin(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return null

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authData.user) return null
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', authData.user.id).maybeSingle()
  return data?.role === 'admin' ? authData.user : null
}

export async function GET(request: Request) {
  try {
    if (!(await getAuthenticatedAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const { data: ratings, error } = await supabaseAdmin
      .from('doctor_consultation_ratings')
      .select('id, consultation_id, patient_id, doctor_id, rating, review, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      const unavailable = error.code === 'PGRST205' || String(error.message || '').includes('doctor_consultation_ratings')
      if (unavailable) return NextResponse.json({ error: 'Apply Database/doctor_consultation_ratings.sql first.' }, { status: 503 })
      throw error
    }

    const patientIds = [...new Set((ratings || []).map(item => item.patient_id))]
    const doctorIds = [...new Set((ratings || []).map(item => item.doctor_id))]
    const [patientsResult, doctorsResult] = await Promise.all([
      patientIds.length
        ? supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', patientIds)
        : Promise.resolve({ data: [] }),
      doctorIds.length
        ? supabaseAdmin.from('doctor_profiles').select('id, full_name, specialty').in('id', doctorIds)
        : Promise.resolve({ data: [] }),
    ])

    const patients = new Map((patientsResult.data || []).map(patient => [patient.id, patient]))
    const doctors = new Map((doctorsResult.data || []).map(doctor => [doctor.id, doctor]))
    const enriched = (ratings || []).map(item => {
      const patient = patients.get(item.patient_id)
      const doctor = doctors.get(item.doctor_id)
      return {
        ...item,
        patient_name: `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || patient?.email || 'Patient',
        doctor_name: doctor?.full_name || 'Doctor',
        doctor_specialty: doctor?.specialty || '',
      }
    })

    const average = enriched.length
      ? Math.round((enriched.reduce((sum, item) => sum + Number(item.rating), 0) / enriched.length) * 10) / 10
      : 0
    return NextResponse.json({ ratings: enriched, summary: { total: enriched.length, average } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load ratings.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
