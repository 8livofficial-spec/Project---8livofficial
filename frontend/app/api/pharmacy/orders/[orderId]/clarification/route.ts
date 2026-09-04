import { NextResponse } from 'next/server'
import { assertPharmacyOrderAccess } from '@/lib/pharmacySecurity'
import { transitionOrderStatus } from '@/lib/pharmacyOrderStateMachine'

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const context = await assertPharmacyOrderAccess(request, params.orderId)
    const body = await request.json()

    const notes = String(body.notes || body.clarification_notes || '').trim()
    if (!notes) {
      return NextResponse.json(
        { error: 'Clarification notes are required to escalate back to the clinical team.' },
        { status: 400 }
      )
    }

    const updated = await transitionOrderStatus({
      orderId: params.orderId,
      newStatus: 'CLARIFICATION_REQUIRED',
      actorId: context.user.id,
      actorRole: context.role,
      pharmacyId: context.pharmacy.id,
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
