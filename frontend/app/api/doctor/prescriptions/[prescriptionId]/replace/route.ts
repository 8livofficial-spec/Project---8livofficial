import { NextResponse } from 'next/server'
import { assertDoctor, errorResponse } from '@/lib/fulfilmentAuth'
import { replacePrescription, validatePrescriptionInput } from '@/lib/prescriptionService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertDoctor(request)
    const { prescriptionId } = await context.params
    const input = validatePrescriptionInput(await request.json().catch(() => ({})))
    const prescription = await replacePrescription(prescriptionId, auth.user.id, input)
    return NextResponse.json({ prescription }, { status: 201 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
