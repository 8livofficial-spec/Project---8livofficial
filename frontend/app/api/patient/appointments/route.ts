import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'

export async function GET(request: Request) {
  try {
    const authenticatedPatient = await getAuthenticatedPatient(request)
    if ('error' in authenticatedPatient) {
      return NextResponse.json({ error: authenticatedPatient.error }, { status: authenticatedPatient.status })
    }

    const patientId = authenticatedPatient.user.id

    const [doctorRes, staffRes] = await Promise.all([
      supabaseAdmin
        .from('doctor_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('staff_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
    ])

    if (doctorRes.error) throw doctorRes.error
    if (staffRes.error) throw staffRes.error

    const doctorRows = doctorRes.data || []
    const staffRows = staffRes.data || []

    const doctorIds = Array.from(new Set(doctorRows.map(row => row.doctor_id).filter(Boolean))) as string[]
    const staffIds = Array.from(new Set(staffRows.map(row => row.staff_id).filter(Boolean))) as string[]

    const [doctorProfilesRes, providerProfilesRes, profilesRes] = await Promise.all([
      doctorIds.length
        ? supabaseAdmin.from('doctor_profiles').select('id, full_name').in('id', doctorIds)
        : Promise.resolve({ data: [] as any[], error: null as any }),
      staffIds.length
        ? supabaseAdmin.from('provider_profiles').select('provider_id, full_name, role').in('provider_id', staffIds)
        : Promise.resolve({ data: [] as any[], error: null as any }),
      staffIds.length
        ? supabaseAdmin.from('profiles').select('id, first_name, last_name, display_id').in('id', staffIds)
        : Promise.resolve({ data: [] as any[], error: null as any }),
    ])

    if (doctorProfilesRes.error) throw doctorProfilesRes.error
    if (providerProfilesRes.error) throw providerProfilesRes.error
    if (profilesRes.error) throw profilesRes.error

    return NextResponse.json({
      doctorConsultations: doctorRows,
      staffConsultations: staffRows,
      doctorProfiles: doctorProfilesRes.data || [],
      providerProfiles: providerProfilesRes.data || [],
      profiles: profilesRes.data || [],
    })
  } catch (err: any) {
    console.error('Error fetching patient appointments:', err)
    return NextResponse.json({ error: err.message || 'Unable to load appointments.' }, { status: 500 })
  }
}
