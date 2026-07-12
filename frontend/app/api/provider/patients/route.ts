import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { loadAssignedProviderPatients } from '@/lib/providerAssignedPatients'
import { patientSearchOrFilter } from '@/lib/queryFilters'

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '25')
  const search = searchParams.get('search') || ''

  let matchingPatientIds: string[] = []
  if (search.trim()) {
    const [matchedProfiles, matchedAssess] = await Promise.all([
      supabaseAdmin.from('profiles').select('id').or(patientSearchOrFilter(search)),
      supabaseAdmin.from('health_assessments').select('patient_id').or(patientSearchOrFilter(search, false))
    ])
    const ids = new Set([
      ...(matchedProfiles.data || []).map((p: any) => p.id),
      ...(matchedAssess.data || []).map((a: any) => a.patient_id)
    ])
    matchingPatientIds = Array.from(ids)
    if (!matchingPatientIds.length) {
      return NextResponse.json({
        patients: [],
        totalCount: 0,
        totalPages: 0,
        summary: { assignedPatients: 0, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
      })
    }
  }

  const result = await loadAssignedProviderPatients(provider.user.id, provider.role, {
    patientIds: matchingPatientIds.length ? matchingPatientIds : undefined,
    page,
    limit,
  })
  return NextResponse.json({
    patients: result.patients,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    summary: result.summary,
  })
}
