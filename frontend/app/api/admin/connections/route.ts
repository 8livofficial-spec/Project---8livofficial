import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ilikePattern } from '@/lib/queryFilters'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '25')))
    const appointmentFilter = searchParams.get('appointment') || 'all'
    const searchPattern = ilikePattern(searchParams.get('search') || '')
    const from = (page - 1) * limit
    const to = page * limit - 1

    let query = supabaseAdmin
      .from('doctor_consultations')
      .select('id, patient_id, doctor_id, status, booking_date, booking_time, prescription_type, prescription_text, prescription_notes, call_started_at, call_ended_at, created_at', { count: 'exact' })

    if (appointmentFilter !== 'all') {
      query = query.eq('status', appointmentFilter)
    } else {
      query = query.in('status', ['scheduled', 'calling', 'attended', 'approved', 'rejected'])
    }

    if (searchPattern) {
      const [matchedPatients, matchedDoctors] = await Promise.all([
        supabaseAdmin.from('health_assessments').select('patient_id').or(`full_name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`),
        supabaseAdmin.from('doctor_profiles').select('id').ilike('full_name', searchPattern),
      ])
      const matchingPatientIds = (matchedPatients.data || []).map((p: any) => p.patient_id)
      const matchingDoctorIds = (matchedDoctors.data || []).map((d: any) => d.id)
      const orConditions = []
      if (matchingPatientIds.length > 0) orConditions.push(`patient_id.in.(${matchingPatientIds.join(',')})`)
      if (matchingDoctorIds.length > 0) orConditions.push(`doctor_id.in.(${matchingDoctorIds.join(',')})`)
      if (!orConditions.length) return NextResponse.json({ connections: [], totalPages: 0 })
      query = query.or(orConditions.join(','))
    }

    const { data: cons, count, error } = await query.order('created_at', { ascending: false }).range(from, to)
    if (error) throw error
    if (!cons?.length) return NextResponse.json({ connections: [], totalPages: 0 })

    const docIds = [...new Set(cons.map((c: any) => c.doctor_id).filter(Boolean))]
    const patientIds = [...new Set(cons.map((c: any) => c.patient_id).filter(Boolean))]
    const [{ data: docProfiles }, { data: patientData }] = await Promise.all([
      docIds.length ? supabaseAdmin.from('doctor_profiles').select('id, full_name').in('id', docIds) : Promise.resolve({ data: [] }),
      patientIds.length ? supabaseAdmin.from('health_assessments').select('patient_id, full_name, first_name, last_name, phone_number, age').in('patient_id', patientIds) : Promise.resolve({ data: [] }),
    ])

    const docMap: Record<string, string> = {}
    ;(docProfiles || []).forEach((d: any) => { docMap[d.id] = d.full_name || 'Dr. Expert' })
    const patMap: Record<string, any> = {}
    ;(patientData || []).forEach((p: any) => { patMap[p.patient_id] = p })

    const connections = cons.map((c: any) => ({
      ...c,
      doctor_name: docMap[c.doctor_id || ''] || 'Unknown Doctor',
      patient_name: patMap[c.patient_id]?.full_name || `${patMap[c.patient_id]?.first_name || ''} ${patMap[c.patient_id]?.last_name || ''}`.trim() || 'Unknown Patient',
      patient_phone: patMap[c.patient_id]?.phone_number || '',
      patient_age: patMap[c.patient_id]?.age || '',
    }))

    return NextResponse.json({ connections, totalPages: Math.ceil((count || 0) / limit) })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load connections.' }, { status })
  }
}
