import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'

type RouteContext = { params: Promise<{ invitationId: string }> }

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const admin = await assertAdmin(request)
    const { invitationId } = await context.params

    const { data: existing, error: findError } = await supabaseAdmin
      .from('pharmacy_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle()

    if (findError) throw findError
    if (!existing) throw new Error('Pharmacy invitation not found.')

    if (existing.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot cancel an invitation that has already been accepted.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('pharmacy_invitations')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)

    if (updateError) throw updateError

    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: 'PHARMACY_INVITATION_CANCELLED',
      newValues: { invitation_id: invitationId, pharmacy_name: existing.pharmacy_name, email: existing.email },
      request,
    })

    return NextResponse.json({ success: true, message: 'Invitation cancelled successfully.' })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
