import { NextResponse } from 'next/server'
import { assertDoctor, errorResponse } from '@/lib/fulfilmentAuth'
import { cancelPrescription } from '@/lib/prescriptionService'

type RouteContext = { params: Promise<{ prescriptionId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertDoctor(request)
    const { prescriptionId } = await context.params
    const body = await request.json().catch(() => ({}))
    await cancelPrescription(prescriptionId, auth.user.id, String(body.reason || 'Cancelled by doctor'))
    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
