import { NextResponse } from 'next/server'
import { loadPatientJourneyState } from '@/lib/patientJourneyServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    if (!patientId) return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })

    const state = await loadPatientJourneyState(patientId)
    return NextResponse.json({ state })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load journey state.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
