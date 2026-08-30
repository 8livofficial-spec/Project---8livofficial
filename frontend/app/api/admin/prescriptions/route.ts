import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const params = new URL(request.url).searchParams
    const search = params.get('search')?.trim()
    const status = params.get('status')?.trim()

    let prescriptions: any[] = []

    // 1. Try rich relational query
    try {
      let query = supabaseAdmin
        .from('prescriptions')
        .select('*, prescription_items(*), pharmacy_orders(*)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (status) query = query.eq('status', status)
      if (search) query = query.ilike('prescription_number', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      prescriptions = data || []
    } catch (err: any) {
      console.warn('[admin/prescriptions] Relational query failed, falling back to basic query:', err?.message)
      // 2. Fallback to basic query
      try {
        let fallbackQuery = supabaseAdmin
          .from('prescriptions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (status) fallbackQuery = fallbackQuery.eq('status', status)
        if (search) fallbackQuery = fallbackQuery.ilike('prescription_number', `%${search}%`)
        const { data: fallbackData } = await fallbackQuery
        prescriptions = fallbackData || []
      } catch (fallbackErr: any) {
        console.warn('[admin/prescriptions] Basic query also failed:', fallbackErr?.message)
        prescriptions = []
      }
    }

    const patientIds = Array.from(new Set(prescriptions.map((rx: any) => rx.patient_id).filter(Boolean)))
    const doctorIds = Array.from(new Set(prescriptions.map((rx: any) => rx.doctor_id).filter(Boolean)))

    let patientsMap = new Map()
    let doctorsMap = new Map()

    if (patientIds.length > 0) {
      try {
        const { data: patientsData } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', patientIds)
        if (patientsData) {
          patientsMap = new Map(patientsData.map((p: any) => [p.id, p]))
        }
      } catch (pErr) {
        console.warn('[admin/prescriptions] Failed to fetch patient profiles:', pErr)
      }
    }

    if (doctorIds.length > 0) {
      try {
        const { data: doctorsData } = await supabaseAdmin
          .from('doctor_profiles')
          .select('id, full_name, specialty')
          .in('id', doctorIds)
        if (doctorsData) {
          doctorsMap = new Map(doctorsData.map((d: any) => [d.id, d]))
        }
      } catch (dErr) {
        console.warn('[admin/prescriptions] Failed to fetch doctor profiles:', dErr)
      }
    }

    return NextResponse.json({
      prescriptions: prescriptions.map((rx: any) => ({
        ...rx,
        patient: patientsMap.get(rx.patient_id) || null,
        doctor: doctorsMap.get(rx.doctor_id) || null,
      })),
    })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error, prescriptions: [] }, { status: failure.status })
  }
}
