import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { canJoinConsultation, labelForRole } from '@/lib/providerConsultations'
import { creditCompletedConsultation } from '@/lib/walletLedger'

const terminalStatuses = ['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient']

async function creditProviderWallet(input: {
  providerId: string
  patientId: string
  appointmentId: string
  appointmentType?: string | null
  providerRole: string
}) {
  return creditCompletedConsultation({
    providerId: input.providerId,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    appointmentType: input.appointmentType || `${input.providerRole.toUpperCase()}_CONSULTATION`,
    createdBy: input.providerId,
  })
}

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '25')
  const search = searchParams.get('search') || ''

  let matchingPatientIds: string[] = []
  if (search.trim()) {
    const { data: matchedProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
    matchingPatientIds = (matchedProfiles || []).map((p: any) => p.id)
  }

  let query = supabaseAdmin
    .from('staff_consultations')
    .select('*', { count: 'exact' })
    .eq('staff_id', provider.user.id);

  if (status) query = query.eq('status', status)

  if (search.trim()) {
    if (matchingPatientIds.length > 0) {
      query = query.in('patient_id', matchingPatientIds)
    } else {
      return NextResponse.json({
        consultations: [],
        stats: { total: 0, today: 0, upcoming: 0, completed: 0, missed: 0, cancelled: 0 },
        totalCount: 0,
        totalPages: 0
      })
    }
  }

  const from = (page - 1) * limit
  const to = page * limit - 1

  const { data, error, count } = await query
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const patientIds = Array.from(new Set((data || []).map((row) => row.patient_id).filter(Boolean)))
  const { data: profiles } = patientIds.length
    ? await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', patientIds)
    : { data: [] as any[] }

  const consultations = (data || []).map((session) => {
    const profile = profiles?.find((item) => item.id === session.patient_id)
    const patientName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Patient'
    return {
      ...session,
      patientName,
      roleLabel: labelForRole(session.staff_role),
      canJoin: canJoinConsultation(session.booking_date, session.booking_time, session.status),
      meetingUrl: session.meeting_url || session.room_url,
      meetingProvider: session.meeting_provider || 'JITSI',
      appointmentType: session.appointment_type || `${String(session.staff_role || provider.role).toUpperCase()}_CONSULTATION`,
    }
  })

  // Load stats from lightweight select
  const { data: allStatsData } = await supabaseAdmin
    .from('staff_consultations')
    .select('booking_date, status')
    .eq('staff_id', provider.user.id)

  const today = new Date().toISOString().split('T')[0]
  const stats = {
    total: allStatsData?.length || 0,
    today: (allStatsData || []).filter((session) => session.booking_date === today && !terminalStatuses.includes(String(session.status || '').toLowerCase())).length,
    upcoming: (allStatsData || []).filter((session) => String(session.status || '').toLowerCase() === 'scheduled').length,
    completed: (allStatsData || []).filter((session) => String(session.status || '').toLowerCase() === 'completed').length,
    missed: (allStatsData || []).filter((session) => ['missed', 'missed_by_patient'].includes(String(session.status || '').toLowerCase())).length,
    cancelled: (allStatsData || []).filter((session) => String(session.status || '').toLowerCase().includes('cancelled')).length,
  }

  return NextResponse.json({
    consultations,
    stats,
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  })
}

export async function PATCH(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const { consultationId, action, notes } = await request.json()
  if (!consultationId || !['complete', 'missed', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'consultationId and a valid action are required.' }, { status: 400 })
  }

  const statusByAction: Record<string, string> = {
    complete: 'completed',
    missed: 'missed_by_patient',
    cancel: 'cancelled_by_doctor',
  }
  const nextStatus = statusByAction[action]

  const { data, error } = await supabaseAdmin
    .from('staff_consultations')
    .update({
      status: nextStatus,
      is_completed: action === 'complete',
      completed_at: action === 'complete' ? new Date().toISOString() : null,
      consultation_notes: notes || null,
    })
    .eq('id', consultationId)
    .eq('staff_id', provider.user.id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Consultation not found.' }, { status: 404 })

  await supabaseAdmin
    .from('patient_notifications')
    .insert({
      patient_id: data.patient_id,
      type: 'appointment',
      title: `${labelForRole(data.staff_role)} session ${nextStatus.replaceAll('_', ' ')}`,
      message: `Your ${labelForRole(data.staff_role)} video session has been marked ${nextStatus.replaceAll('_', ' ')}.`,
      is_read: false,
    })

  if (action === 'complete') {
    try {
      await creditProviderWallet({
        providerId: provider.user.id,
        patientId: data.patient_id,
        appointmentId: data.id,
        appointmentType: data.appointment_type,
        providerRole: data.staff_role || provider.role,
      })
    } catch (walletError) {
      console.error('Provider wallet credit failed:', walletError)
    }
  }

  return NextResponse.json({ consultation: data })
}
