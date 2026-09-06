import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'
import { notifyDomainEvent } from '@/lib/notificationDispatcher'
import { resolveTenant } from '@/lib/apiSecurity'
import { validateDeliveryAddress } from '../delivery-address/route'

export async function POST(request: Request) {
  try {
    const auth = await assertPatient(request)
    const tenantId = resolveTenant(request, auth.user)
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

    // Tenant check
    if (prescription.tenant_id && prescription.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Prescription tenant mismatch.' }, { status: 403 })
    }

    // 9, 10, 11: Status checks: Must be ISSUED/SIGNED, not REVOKED or CANCELLED
    if (['REVOKED', 'CANCELLED'].includes(prescription.status)) {
      return NextResponse.json(
        { error: `Cannot confirm delivery for prescription with status ${prescription.status}.` },
        { status: 400 }
      )
    }

    if (!['ISSUED', 'SIGNED'].includes(prescription.status)) {
      return NextResponse.json(
        { error: `Cannot confirm delivery for prescription with status ${prescription.status}. Prescription must be officially authorized/issued by your doctor.` },
        { status: 400 }
      )
    }

    // 12: Expiry check
    if (prescription.valid_until) {
      const expiryDate = new Date(prescription.valid_until)
      const now = new Date()
      // If valid_until has passed (end of day)
      expiryDate.setHours(23, 59, 59, 999)
      if (expiryDate < now) {
        return NextResponse.json(
          { error: 'Cannot confirm delivery: This prescription has expired.' },
          { status: 400 }
        )
      }
    }

    // 5, 6, 7, 8: Treatment Cycle & Entitlement validation
    let cycleId = prescription.treatment_cycle_id
    let cycleData: any = null

    if (cycleId) {
      const { data: cData, error: cErr } = await supabaseAdmin
        .from('treatment_cycles')
        .select('*')
        .eq('id', cycleId)
        .eq('patient_id', auth.user.id)
        .maybeSingle()
      if (cErr) throw cErr
      cycleData = cData
    } else {
      // Find active treatment cycle for this patient and bind it
      const { data: activeCycle } = await supabaseAdmin
        .from('treatment_cycles')
        .select('*')
        .eq('patient_id', auth.user.id)
        .in('status', ['ACTIVE', 'UNDER_REVIEW', 'PRESCRIBED', 'FULFILLMENT', 'PENDING'])
        .order('cycle_number', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (activeCycle) {
        cycleId = activeCycle.id
        cycleData = activeCycle
        await supabaseAdmin
          .from('prescriptions')
          .update({ treatment_cycle_id: cycleId })
          .eq('id', prescriptionId)
      }
    }

    if (!cycleData) {
      // Auto-provision Care Subscription & Treatment Cycle for authorized clinical prescription
      try {
        let { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('patient_id', auth.user.id)
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const now = new Date()
        const startDateStr = now.toISOString().split('T')[0]
        const endDate = new Date(now)
        endDate.setMonth(endDate.getMonth() + 3)
        const endDateStr = endDate.toISOString().split('T')[0]

        if (!sub) {
          const { data: newSub, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
              tenant_id: tenantId,
              patient_id: auth.user.id,
              duration_months: 3,
              program_name: 'Medical Weight Management',
              base_monthly_price: 4999,
              original_price: 14997,
              final_price: 14997,
              start_date: startDateStr,
              end_date: endDateStr,
              status: 'ACTIVE',
              payment_status: 'PAID',
            })
            .select('*')
            .maybeSingle()

          if (!subError && newSub) {
            sub = newSub
          }
        }

        if (sub) {
          const cycleEndDate = new Date(now)
          cycleEndDate.setDate(cycleEndDate.getDate() + 30)
          const cycleEndDateStr = cycleEndDate.toISOString().split('T')[0]

          const { data: newCycle, error: cycleErr } = await supabaseAdmin
            .from('treatment_cycles')
            .insert({
              tenant_id: tenantId,
              subscription_id: sub.id,
              patient_id: auth.user.id,
              doctor_id: prescription.doctor_id || null,
              cycle_number: 1,
              start_date: startDateStr,
              end_date: cycleEndDateStr,
              status: 'ACTIVE',
            })
            .select('*')
            .maybeSingle()

          if (newCycle) {
            cycleId = newCycle.id
            cycleData = newCycle
          } else {
            const { data: existingC } = await supabaseAdmin
              .from('treatment_cycles')
              .select('*')
              .eq('subscription_id', sub.id)
              .eq('cycle_number', 1)
              .maybeSingle()
            if (existingC) {
              cycleId = existingC.id
              cycleData = existingC
            }
          }

          if (cycleId) {
            await supabaseAdmin
              .from('prescriptions')
              .update({ treatment_cycle_id: cycleId })
              .eq('id', prescriptionId)
          }
        }
      } catch (provisionErr) {
        console.warn('[confirm-delivery] Auto-provision treatment cycle warning:', provisionErr)
      }
    }

    if (!cycleData) {
      return NextResponse.json(
        { error: 'Cannot confirm delivery: Prescription is not linked to an active treatment cycle or care subscription entitlement.' },
        { status: 400 }
      )
    }

    if (cycleData.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot confirm delivery: The associated treatment cycle has been cancelled.' },
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

    // 13. Patient Acknowledgement & Consent Verification
    const consent = body.consent || {
      reviewed_prescription: body.reviewed_prescription ?? body.consent_reviewed,
      consent_transmission: body.consent_transmission ?? body.consent_fulfillment,
      confirm_delivery_info: body.confirm_delivery_info ?? body.consent_address,
    }

    if (
      consent.reviewed_prescription !== true ||
      consent.consent_transmission !== true ||
      consent.confirm_delivery_info !== true
    ) {
      return NextResponse.json(
        {
          error:
            'Patient consent is mandatory: You must acknowledge reviewing the prescription, consent to electronic transmission to the partner pharmacy, and confirm your delivery details.',
        },
        { status: 400 }
      )
    }

    // Record auditable patient consent event
    const nowIso = new Date().toISOString()
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '::1'
    const userAgent = request.headers.get('user-agent') || 'Browser'
    const prescriptionHash = prescription.canonical_content_hash || prescription.signature_hash || 'hash'

    try {
      await supabaseAdmin.from('patient_prescription_consents').insert({
        tenant_id: tenantId,
        patient_id: auth.user.id,
        prescription_id: prescriptionId,
        prescription_version: prescription.version || 1,
        prescription_hash: prescriptionHash,
        consent_type: 'ELECTRONIC_TRANSMISSION_AND_FULFILLMENT',
        consented_at: nowIso,
        ip_address: clientIp,
        user_agent: userAgent,
      })
    } catch (cErr) {
      console.warn('[confirm-delivery] patient_prescription_consents insert fallback note:', cErr)
    }

    await audit({
      actorId: auth.user.id,
      actorRole: 'patient',
      action: 'PATIENT_CONSENT_CAPTURED',
      newValues: {
        prescription_id: prescriptionId,
        prescription_version: prescription.version || 1,
        prescription_hash: prescriptionHash,
        consent_type: 'ELECTRONIC_TRANSMISSION_AND_FULFILLMENT',
        consented_at: nowIso,
      },
      request,
    })

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
            tenant_id: tenantId,
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
        tenant_id: tenantId,
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
