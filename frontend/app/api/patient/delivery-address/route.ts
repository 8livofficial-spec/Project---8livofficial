import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

export function validateDeliveryAddress(body: any) {
  const recipient_name = String(body.recipient_name || body.recipientName || '').trim()
  const line1 = String(body.line1 || '').trim()
  const line2 = body.line2 ? String(body.line2).trim() : null
  const area = body.area ? String(body.area).trim() : null
  const city = String(body.city || '').trim()
  const state = String(body.state || '').trim()
  const pincode = String(body.pincode || '').trim()
  let phone = String(body.phone || '').trim().replace(/^(\+91|0)/, '')

  if (!recipient_name || recipient_name.length > 100) {
    throw new Error('Valid recipient name is required (max 100 characters).')
  }
  if (!line1 || line1.length > 200) {
    throw new Error('Valid address line 1 is required (max 200 characters).')
  }
  if (line2 && line2.length > 200) {
    throw new Error('Address line 2 must not exceed 200 characters.')
  }
  if (area && area.length > 100) {
    throw new Error('Area must not exceed 100 characters.')
  }
  if (!city || city.length > 100) {
    throw new Error('City is required (max 100 characters).')
  }
  const matchedState = INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase())
  if (!matchedState) {
    throw new Error(`Invalid state. Must be a recognized Indian State or Union Territory.`)
  }
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    throw new Error('Pincode must be a valid 6-digit Indian postal code.')
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error('Phone must be a valid 10-digit Indian mobile number.')
  }

  return {
    recipient_name,
    line1,
    line2,
    area,
    city,
    state: matchedState,
    pincode,
    phone,
    is_default: Boolean(body.is_default || body.isDefault),
  }
}

export async function GET(request: Request) {
  try {
    const auth = await assertPatient(request)

    const { data: addresses, error } = await supabaseAdmin
      .from('patient_delivery_addresses')
      .select('*')
      .eq('patient_id', auth.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ addresses: addresses || [] })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertPatient(request)
    const body = await request.json().catch(() => ({}))
    const validated = validateDeliveryAddress(body)

    // If marked as default, unset default on all other addresses for this patient
    if (validated.is_default) {
      await supabaseAdmin
        .from('patient_delivery_addresses')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('patient_id', auth.user.id)
        .eq('is_default', true)
    }

    const { data: address, error } = await supabaseAdmin
      .from('patient_delivery_addresses')
      .insert({
        tenant_id: '8liv',
        patient_id: auth.user.id,
        recipient_name: validated.recipient_name,
        line1: validated.line1,
        line2: validated.line2,
        area: validated.area,
        city: validated.city,
        state: validated.state,
        pincode: validated.pincode,
        phone: validated.phone,
        is_default: validated.is_default,
      })
      .select('*')
      .single()

    if (error) throw error

    await audit({
      actorId: auth.user.id,
      actorRole: 'patient',
      action: 'DELIVERY_ADDRESS_SAVED',
      newValues: { address_id: address.id, city: address.city, state: address.state, pincode: address.pincode },
      request,
    })

    return NextResponse.json({ success: true, address }, { status: 201 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
