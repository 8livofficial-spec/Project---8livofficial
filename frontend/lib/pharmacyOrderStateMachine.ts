import { supabaseAdmin } from './supabaseServer'
import { audit } from './prescriptionService'
import { notifyDomainEvent } from './notificationDispatcher'

export type PartnerOrderStatus =
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'STOCK_CONFIRMED'
  | 'PREPARING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CLARIFICATION_REQUIRED'
  | 'UNABLE_TO_FULFILL'
  | 'PARTIALLY_FULFILLED'
  | 'CANCELLED'

const LEGAL_TRANSITIONS: Record<string, string[]> = {
  // Initial incoming order statuses (including legacy PENDING_ADMIN_REVIEW)
  RECEIVED: ['ACKNOWLEDGED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PENDING_ADMIN_REVIEW: ['ACKNOWLEDGED', 'UNDER_REVIEW', 'READY_TO_PLACE', 'CANCELLED'],
  READY_TO_PLACE: ['RECEIVED', 'ACKNOWLEDGED', 'ORDER_PLACED_WITH_APOLLO', 'CANCELLED'],
  ORDER_PLACED_WITH_APOLLO: ['CONFIRMED_BY_APOLLO', 'ACKNOWLEDGED', 'CANCELLED'],
  CONFIRMED_BY_APOLLO: ['STOCK_CONFIRMED', 'PREPARING', 'PACKED', 'CANCELLED'],
  UNDER_REVIEW: ['ACKNOWLEDGED', 'RECEIVED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],

  // Partner Pharmacy lifecycle transitions
  ACKNOWLEDGED: ['STOCK_CONFIRMED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  STOCK_CONFIRMED: ['PREPARING', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PACKED: ['DISPATCHED', 'SHIPPED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  
  // Exception handling transitions
  CLARIFICATION_REQUIRED: ['ACKNOWLEDGED', 'STOCK_CONFIRMED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PARTIALLY_FULFILLED: ['DISPATCHED', 'CANCELLED'],
  UNABLE_TO_FULFILL: ['CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export function validateOrderStateTransition(currentStatus: string, targetStatus: string): boolean {
  const normalizedCurrent = currentStatus.toUpperCase()
  const normalizedTarget = targetStatus.toUpperCase()
  
  if (normalizedCurrent === normalizedTarget) return true

  const allowedNext = LEGAL_TRANSITIONS[normalizedCurrent] || []
  return allowedNext.includes(normalizedTarget)
}

/**
 * Execute a valid status transition for a partner pharmacy order.
 * Strictly guarantees that pharmacy actions NEVER touch clinical prescription fields.
 */
export async function transitionOrderStatus(params: {
  orderId: string
  newStatus: PartnerOrderStatus
  actorId: string
  actorRole: string
  pharmacyId?: string | null
  reason?: string | null
  courierName?: string | null
  trackingNumber?: string | null
  clarificationNotes?: string | null
  unableReason?: string | null
  request?: Request
}) {
  const { orderId, newStatus, actorId, actorRole, pharmacyId, reason, courierName, trackingNumber, clarificationNotes, unableReason, request } = params

  // 1. Fetch current order
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('*, prescriptions(id, patient_id, prescription_number, treatment_cycle_id)')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    throw new Error('Order not found.')
  }

  const currentStatus = (order.status || 'RECEIVED').toUpperCase()

  // 2. Validate state machine rule
  if (!validateOrderStateTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid state transition: Cannot transition pharmacy order from ${currentStatus} to ${newStatus}.`)
  }

  // 3. Prepare update payload (pure fulfillment fields only)
  const now = new Date().toISOString()
  const updates: Record<string, any> = {
    status: newStatus,
    updated_at: now,
  }

  if (pharmacyId && !order.pharmacy_id) {
    updates.pharmacy_id = pharmacyId
  }

  if (newStatus === 'DISPATCHED') {
    if (!courierName?.trim() || !trackingNumber?.trim()) {
      throw new Error('Courier name and tracking number are required to dispatch an order.')
    }
    updates.dispatch_courier_name = courierName.trim()
    updates.dispatch_tracking_number = trackingNumber.trim()
    updates.tracking_number = trackingNumber.trim()
    updates.dispatched_at = now
    updates.fulfillment_status = 'SHIPPED'
  }

  if (newStatus === 'DELIVERED') {
    updates.delivered_at = now
    updates.fulfillment_status = 'DELIVERED'
  }

  if (newStatus === 'CLARIFICATION_REQUIRED') {
    if (!clarificationNotes?.trim()) {
      throw new Error('Clarification notes are required to request clarification.')
    }
    updates.clarification_notes = clarificationNotes.trim()
  }

  if (newStatus === 'UNABLE_TO_FULFILL') {
    if (!unableReason?.trim()) {
      throw new Error('Reason is required when marking an order as unable to fulfill.')
    }
    updates.unable_to_fulfill_reason = unableReason.trim()
  }

  // 4. Update the order in database
  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('pharmacy_orders')
    .update(updates)
    .eq('id', orderId)
    .select('*')
    .single()

  if (updateError) throw updateError

  // 5. Append to status history
  await supabaseAdmin.from('pharmacy_order_status_history').insert({
    pharmacy_order_id: orderId,
    previous_status: currentStatus,
    new_status: newStatus,
    changed_by: actorId,
    reason: reason || clarificationNotes || unableReason || `Pharmacy transitioned to ${newStatus}`,
    metadata: {
      courier_name: courierName || null,
      tracking_number: trackingNumber || null,
    },
  })

  // 6. Record audit log
  await audit({
    pharmacyOrderId: orderId,
    prescriptionId: order.prescription_id,
    actorId,
    actorRole,
    action: `PHARMACY_ORDER_${newStatus}`,
    previousValues: { status: currentStatus },
    newValues: { status: newStatus, courierName, trackingNumber },
    reason: reason || clarificationNotes || unableReason,
    request,
  })

  // 7. If linked to a treatment cycle, update cycle fulfillment state
  const prescription = order.prescriptions as any
  if (prescription?.treatment_cycle_id) {
    if (newStatus === 'DISPATCHED') {
      await supabaseAdmin
        .from('treatment_cycles')
        .update({ status: 'FULFILLMENT', updated_at: now })
        .eq('id', prescription.treatment_cycle_id)
    } else if (newStatus === 'DELIVERED') {
      await supabaseAdmin
        .from('treatment_cycles')
        .update({ status: 'COMPLETED', updated_at: now })
        .eq('id', prescription.treatment_cycle_id)
    }
  }

  // 8. Trigger domain notifications asynchronously (privacy-safe, non-blocking)
  const patientId = order.patient_id || prescription?.patient_id
  if (patientId) {
    const eventTypeMap: Record<string, string> = {
      ACKNOWLEDGED: 'PHARMACY_ORDER_ACKNOWLEDGED',
      STOCK_CONFIRMED: 'STOCK_CONFIRMED',
      PREPARING: 'PREPARING_STARTED',
      DISPATCHED: 'ORDER_DISPATCHED',
      DELIVERED: 'ORDER_DELIVERED',
      CLARIFICATION_REQUIRED: 'CLARIFICATION_REQUESTED',
      UNABLE_TO_FULFILL: 'UNABLE_TO_FULFILL',
    }

    const domainEvent = eventTypeMap[newStatus]
    if (domainEvent) {
      notifyDomainEvent({
        eventType: domainEvent as any,
        patientId,
        actorId,
        metadata: {
          orderId,
          prescriptionNumber: prescription?.prescription_number,
          courierName: courierName || null,
          trackingNumber: trackingNumber || null,
        },
      }).catch((err: any) => {
        console.warn(`[pharmacyOrderStateMachine] Notification error for ${domainEvent}:`, err?.message)
      })
    }
  }

  return updatedOrder
}

/**
 * Filter and sanitize order details so that the partner pharmacy receives only
 * MINIMUM NECESSARY DATA for fulfillment.
 * Strictly strips patient clinical history, lifestyle notes, nutrition diets, etc.
 */
export function sanitizePharmacyOrderForFulfillment(order: any, prescription: any, items: any[], doctor: any) {
  return {
    order_id: order.id,
    order_reference: order.apollo_order_reference || `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`,
    status: order.status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    dispatched_at: order.dispatched_at || null,
    delivered_at: order.delivered_at || null,
    courier_name: order.dispatch_courier_name || null,
    tracking_number: order.dispatch_tracking_number || order.tracking_number || null,
    clarification_notes: order.clarification_notes || null,
    unable_to_fulfill_reason: order.unable_to_fulfill_reason || null,
    
    // Patient fulfillment identity & destination only
    patient: {
      name: order.delivery_address_snapshot?.patient_name || 'Patient',
      phone: order.patient_phone_snapshot || order.delivery_address_snapshot?.phone || null,
      delivery_address: order.delivery_address_snapshot || null,
    },

    // Prescribing doctor identity
    doctor: {
      name: doctor?.full_name || 'Authorized 8LIV Doctor',
      registration_number: doctor?.medical_registration_number || doctor?.registration_number || 'REG-VERIFIED',
    },

    // Prescription record
    prescription: {
      id: prescription?.id,
      prescription_number: prescription?.prescription_number,
      issued_at: prescription?.issued_at,
      valid_until: prescription?.valid_until,
      diagnosis: prescription?.diagnosis,
    },

    // Structured medication items
    items: (items || []).map((item: any) => ({
      id: item.id,
      medicine_name: item.medicine_name,
      generic_name: item.generic_name || null,
      brand_name: item.brand_name || null,
      strength: item.strength,
      dosage_form: item.dosage_form,
      dose: item.dose,
      route: item.route,
      frequency: item.frequency,
      duration_value: item.duration_value,
      duration_unit: item.duration_unit,
      quantity: item.quantity,
      food_instruction: item.food_instruction || null,
      special_instruction: item.special_instruction || null,
    })),
  }
}
