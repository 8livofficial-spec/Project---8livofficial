import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'
import { notifyDomainEvent } from '@/lib/notificationDispatcher'
import { validateDeliveryAddress } from '../delivery-address/route'

export async function POST(request: Request) {
  try {
    const auth = await assertPatient(request)
    const body = await request.json().catch(() => ({}))

    const prescriptionId = body.prescription_id || body.prescriptionId
    if (!prescriptionId) {
      return NextResponse.json({ error: 'Prescription ID is required.' }, { status: 400 })
    }

    // 1. Fetch prescription and verify ownership & status
    const { data: prescription, error: rxError } = await supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*)')
      .eq('id', prescriptionId)
      .eq('patient_id', auth.user.id)
      .maybeSingle()

    if (rxError) throw rxError
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 })
    }

    if (!['ISSUED', 'SIGNED'].includes(prescription.status)) {
      return NextResponse.json(
        { error: `Cannot confirm delivery for prescription with status ${prescription.status}. Prescription must be ISSUED.` },
        { status: 400 }
      )
    }

    // 2. Verify prescription requires fulfillment
    const items = prescription.prescription_items || []
    const fulfillableItems = items.filter((item: any) => Number(item.quantity) > 0)
    if (fulfillableItems.length === 0) {
      return NextResponse.json(
        { error: 'This prescription contains no medications requiring fulfillment.' },
        { status: 400 }
      )
    }

    // 3. Prevent duplicate active fulfillment orders (DB + API pre-check)
    const { data: existingOrder } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*')
      .eq('prescription_id', prescriptionId)
      .not('status', 'in', '("CANCELLED","UNABLE_TO_FULFILL")')
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        order: existingOrder,
        alreadyCreated: true,
        message: 'A fulfillment order has already been created for this prescription.',
      })
    }

    // 4. Resolve delivery address
    let resolvedAddress: any = null

    if (body.address_id || body.addressId) {
      const addressId = body.address_id || body.addressId
      const { data: addr, error: addrError } = await supabaseAdmin
        .from('patient_delivery_addresses')
        .select('*')
        .eq('id', addressId)
        .eq('patient_id', auth.user.id)
        .maybeSingle()

      if (addrError) throw addrError
      if (!addr) {
        return NextResponse.json({ error: 'Selected delivery address not found.' }, { status: 404 })
      }
      resolvedAddress = addr
    } else if (body.address) {
      const validated = validateDeliveryAddress(body.address)
      if (body.save_address) {
        if (validated.is_default) {
          await supabaseAdmin
            .from('patient_delivery_addresses')
            .update({ is_default: false })
            .eq('patient_id', auth.user.id)
            .eq('is_default', true)
        }
        const { data: savedAddr } = await supabaseAdmin
          .from('patient_delivery_addresses')
          .insert({
            tenant_id: '8liv',
            patient_id: auth.user.id,
            ...validated,
          })
          .select('*')
          .single()
        resolvedAddress = savedAddr || validated
      } else {
        resolvedAddress = validated
      }
    } else {
      // Try to find patient default address
      const { data: defaultAddr } = await supabaseAdmin
        .from('patient_delivery_addresses')
        .select('*')
        .eq('patient_id', auth.user.id)
        .eq('is_default', true)
        .maybeSingle()

      if (!defaultAddr) {
        return NextResponse.json(
          { error: 'Please provide or select a delivery address.' },
          { status: 400 }
        )
      }
      resolvedAddress = defaultAddr
    }

    // 5. Create immutable address snapshot
    const deliveryAddressSnapshot = {
      recipient_name: resolvedAddress.recipient_name,
      line1: resolvedAddress.line1,
      line2: resolvedAddress.line2 || '',
      area: resolvedAddress.area || '',
      city: resolvedAddress.city,
      state: resolvedAddress.state,
      pincode: resolvedAddress.pincode,
      phone: resolvedAddress.phone,
      snapshot_taken_at: new Date().toISOString(),
      address_id: resolvedAddress.id || null,
    }

    // 6. Create Pharmacy Order in PENDING_ASSIGNMENT state with pharmacy_id = NULL
    const idempotencyKey = body.idempotency_key || `confirm:${prescriptionId}:${Date.now()}`

    const { data: order, error: createError } = await supabaseAdmin
      .from('pharmacy_orders')
      .insert({
        tenant_id: '8liv',
        prescription_id: prescriptionId,
        patient_id: auth.user.id,
        pharmacy_id: null,
        status: 'PENDING_ASSIGNMENT',
        delivery_address_snapshot: deliveryAddressSnapshot,
        patient_phone_snapshot: resolvedAddress.phone,
        idempotency_key: idempotencyKey,
        version: 1,
      })
      .select('*')
      .single()

    if (createError) {
      if (createError.code === '23505') {
        // Unique constraint violation - return existing active order
        const { data: duplicateOrder } = await supabaseAdmin
          .from('pharmacy_orders')
          .select('*')
          .eq('prescription_id', prescriptionId)
          .not('status', 'in', '("CANCELLED","UNABLE_TO_FULFILL")')
          .maybeSingle()
        if (duplicateOrder) {
          return NextResponse.json({ success: true, order: duplicateOrder, alreadyCreated: true })
        }
      }
      throw createError
    }

    // 7. Insert initial status history
    await supabaseAdmin.from('pharmacy_order_status_history').insert({
      pharmacy_order_id: order.id,
      previous_status: null,
      new_status: 'PENDING_ASSIGNMENT',
      changed_by: auth.user.id,
      reason: 'Patient confirmed delivery address',
      metadata: { address_city: resolvedAddress.city, address_pincode: resolvedAddress.pincode },
    })

    // 8. Audits
    await audit({
      actorId: auth.user.id,
      actorRole: 'patient',
      action: 'DELIVERY_ADDRESS_CONFIRMED',
      newValues: { prescription_id: prescriptionId, city: resolvedAddress.city, pincode: resolvedAddress.pincode },
      request,
    })

    await audit({
      pharmacyOrderId: order.id,
      prescriptionId,
      actorId: auth.user.id,
      actorRole: 'patient',
      action: 'PHARMACY_ORDER_CREATED',
      newValues: { status: 'PENDING_ASSIGNMENT' },
      request,
    })

    // 9. Dispatch notification
    notifyDomainEvent({
      eventType: 'PHARMACY_ORDER_CREATED',
      patientId: auth.user.id,
      actorId: auth.user.id,
      metadata: {
        orderId: order.id,
        prescriptionNumber: prescription.prescription_number,
      },
    }).catch((err) => {
      console.warn('[confirm-delivery] Notification error:', err?.message)
    })

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
