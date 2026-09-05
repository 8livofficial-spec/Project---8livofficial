import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'
import { validateDeliveryAddress } from '../route'

type RouteContext = { params: Promise<{ addressId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { addressId } = await context.params

    const { data: address, error } = await supabaseAdmin
      .from('patient_delivery_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('patient_id', auth.user.id)
      .maybeSingle()

    if (error) throw error
    if (!address) throw new Error('Delivery address not found.')

    return NextResponse.json({ address })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { addressId } = await context.params
    const body = await request.json().catch(() => ({}))

    // Verify ownership
    const { data: existing, error: findError } = await supabaseAdmin
      .from('patient_delivery_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('patient_id', auth.user.id)
      .maybeSingle()

    if (findError) throw findError
    if (!existing) throw new Error('Delivery address not found.')

    const merged = { ...existing, ...body }
    const validated = validateDeliveryAddress(merged)

    if (validated.is_default && !existing.is_default) {
      await supabaseAdmin
        .from('patient_delivery_addresses')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('patient_id', auth.user.id)
        .eq('is_default', true)
    }

    const { data: updated, error } = await supabaseAdmin
      .from('patient_delivery_addresses')
      .update({
        recipient_name: validated.recipient_name,
        line1: validated.line1,
        line2: validated.line2,
        area: validated.area,
        city: validated.city,
        state: validated.state,
        pincode: validated.pincode,
        phone: validated.phone,
        is_default: validated.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq('id', addressId)
      .eq('patient_id', auth.user.id)
      .select('*')
      .single()

    if (error) throw error

    await audit({
      actorId: auth.user.id,
      actorRole: 'patient',
      action: 'DELIVERY_ADDRESS_UPDATED',
      newValues: { address_id: addressId, city: updated.city, state: updated.state, pincode: updated.pincode },
      request,
    })

    return NextResponse.json({ success: true, address: updated })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { addressId } = await context.params

    const { data: existing, error: findError } = await supabaseAdmin
      .from('patient_delivery_addresses')
      .select('id')
      .eq('id', addressId)
      .eq('patient_id', auth.user.id)
      .maybeSingle()

    if (findError) throw findError
    if (!existing) throw new Error('Delivery address not found.')

    const { error } = await supabaseAdmin
      .from('patient_delivery_addresses')
      .delete()
      .eq('id', addressId)
      .eq('patient_id', auth.user.id)

    if (error) throw error

    await audit({
      actorId: auth.user.id,
      actorRole: 'patient',
      action: 'DELIVERY_ADDRESS_DELETED',
      newValues: { address_id: addressId },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
