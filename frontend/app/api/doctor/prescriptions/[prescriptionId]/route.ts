import { NextResponse } from 'next/server'
import { assertDoctor, assertPrescriptionOwnership, errorResponse } from '@/lib/fulfilmentAuth'
import { updateDraftPrescription, validatePrescriptionInput } from '@/lib/prescriptionService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertDoctor(request)
    const { prescriptionId } = await context.params
    const prescription = await assertPrescriptionOwnership(prescriptionId, auth.user.id)
    return NextResponse.json({ prescription })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await assertDoctor(request)
    const { prescriptionId } = await context.params
    const input = validatePrescriptionInput(await request.json().catch(() => ({})))
    await updateDraftPrescription(prescriptionId, auth.user.id, input)
    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
