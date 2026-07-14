import { NextResponse } from 'next/server'
import { assertPatient, assertPatientPrescriptionOwnership, errorResponse } from '@/lib/fulfilmentAuth'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { prescriptionId } = await context.params
    const prescription = await assertPatientPrescriptionOwnership(prescriptionId, auth.user.id)
    return NextResponse.json({ prescription })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
