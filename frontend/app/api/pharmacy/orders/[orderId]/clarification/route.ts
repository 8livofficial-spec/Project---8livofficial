import { NextResponse } from 'next/server'
import { assertPharmacyOrderAccess } from '@/lib/pharmacySecurity'
import { transitionOrderStatus } from '@/lib/pharmacyOrderStateMachine'

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const { orderId } = await Promise.resolve(context.params)
    const accessContext = await assertPharmacyOrderAccess(request, orderId)
    const body = await request.json()

    const notes = String(body.notes || body.clarification_notes || '').trim()
    if (!notes) {
      return NextResponse.json(
        { error: 'Clarification notes are required to escalate back to the clinical team.' },
        { status: 400 }
      )
    }

    const updated = await transitionOrderStatus({
      orderId,
      newStatus: 'CLARIFICATION_REQUIRED',
      actorId: accessContext.user.id,
      actorRole: accessContext.role,
      pharmacyId: accessContext.pharmacy.id,
      clarificationNotes: notes,
      reason: `Clarification requested: ${notes}`,
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const status = err.status || 400
    return NextResponse.json(
      { error: err.message || 'Failed to request clarification' },
      { status }
    )
  }
}
