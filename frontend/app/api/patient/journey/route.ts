import { NextResponse } from 'next/server'
import { loadPatientJourneyState } from '@/lib/patientJourneyServer'
import { assertPatientOrAssignedProvider } from '@/lib/apiSecurity'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    if (!patientId) return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })

    await assertPatientOrAssignedProvider(request, patientId)

    const state = await loadPatientJourneyState(patientId)
    return NextResponse.json({ state })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load journey state.'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
