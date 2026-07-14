import { NextResponse } from 'next/server'
import { assertDoctor, errorResponse } from '@/lib/fulfilmentAuth'
import { signPrescription } from '@/lib/prescriptionService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertDoctor(request)
    const { prescriptionId } = await context.params
    const result = await signPrescription(prescriptionId, auth.user.id)
    return NextResponse.json(result)
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
