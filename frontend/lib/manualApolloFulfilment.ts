import { supabaseAdmin } from './supabaseServer'

export type PharmacyOrderStatus =
  | 'PENDING_ADMIN_REVIEW'
  | 'UNDER_REVIEW'
  | 'READY_TO_PLACE'
  | 'ORDER_PLACED_WITH_APOLLO'
  | 'CONFIRMED_BY_APOLLO'
  | 'PARTIALLY_AVAILABLE'
  | 'UNAVAILABLE'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'

export const APOLLO_STATUSES: PharmacyOrderStatus[] = [
  'PENDING_ADMIN_REVIEW',
  'UNDER_REVIEW',
  'READY_TO_PLACE',
  'ORDER_PLACED_WITH_APOLLO',
  'CONFIRMED_BY_APOLLO',
  'PARTIALLY_AVAILABLE',
  'UNAVAILABLE',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED',
]

const transitions: Record<PharmacyOrderStatus, PharmacyOrderStatus[]> = {
  PENDING_ADMIN_REVIEW: ['UNDER_REVIEW', 'READY_TO_PLACE', 'CANCELLED'],
  UNDER_REVIEW: ['READY_TO_PLACE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'CANCELLED'],
  READY_TO_PLACE: ['ORDER_PLACED_WITH_APOLLO', 'CANCELLED'],
  ORDER_PLACED_WITH_APOLLO: ['CONFIRMED_BY_APOLLO', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'CANCELLED'],
  CONFIRMED_BY_APOLLO: ['PACKED', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'CANCELLED'],
  PARTIALLY_AVAILABLE: ['PACKED', 'CANCELLED', 'REFUND_PENDING'],
  UNAVAILABLE: ['CANCELLED', 'REFUND_PENDING'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUND_PENDING'],
  CANCELLED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: [],
}

export type PharmacyOrderInput = {
  prescriptionId: string
  patientId: string
  idempotencyKey: string
  deliveryAddressSnapshot?: Record<string, unknown>
  patientPhoneSnapshot?: string | null
}

export type PharmacyOrderResult = {
  id: string
  status: PharmacyOrderStatus
}

export type PharmacyOrderUpdateInput = {
  orderId: string
  actorId: string
  nextStatus?: PharmacyOrderStatus
  reason?: string | null
  patch?: Record<string, unknown>
  expectedVersion?: number | null
}

export interface PharmacyFulfilmentProvider {
  createOrder(input: PharmacyOrderInput): Promise<PharmacyOrderResult>
  updateOrder(input: PharmacyOrderUpdateInput): Promise<void>
  getOrderStatus(reference: string): Promise<PharmacyOrderStatus>
  cancelOrder(reference: string): Promise<void>
}

export function assertApolloTransition(from: string, to: string) {
  if (!APOLLO_STATUSES.includes(from as PharmacyOrderStatus) || !APOLLO_STATUSES.includes(to as PharmacyOrderStatus)) {
    throw new Error('Invalid medicine order status.')
  }
  if (!transitions[from as PharmacyOrderStatus].includes(to as PharmacyOrderStatus)) {
    throw new Error(`Invalid transition from ${from} to ${to}.`)
  }
}

function timestampPatch(status: PharmacyOrderStatus, now: string) {
  const map: Partial<Record<PharmacyOrderStatus, string>> = {
    ORDER_PLACED_WITH_APOLLO: 'placed_at',
    CONFIRMED_BY_APOLLO: 'confirmed_at',
    PACKED: 'packed_at',
    SHIPPED: 'shipped_at',
    OUT_FOR_DELIVERY: 'out_for_delivery_at',
    DELIVERED: 'delivered_at',
    CANCELLED: 'cancelled_at',
  }
  const key = map[status]
  return key ? { [key]: now } : {}
}

export class ManualApolloFulfilmentProvider implements PharmacyFulfilmentProvider {
  async createOrder(input: PharmacyOrderInput): Promise<PharmacyOrderResult> {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('id, status')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing?.id) return { id: existing.id, status: existing.status as PharmacyOrderStatus }

    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .insert({
        prescription_id: input.prescriptionId,
        patient_id: input.patientId,
        vendor: 'APOLLO_PHARMACY',
        status: 'PENDING_ADMIN_REVIEW',
        idempotency_key: input.idempotencyKey,
        delivery_address_snapshot: input.deliveryAddressSnapshot || {},
        patient_phone_snapshot: input.patientPhoneSnapshot || null,
      })
      .select('id, status')
      .single()

    if (error) {
      const { data: duplicate } = await supabaseAdmin
        .from('pharmacy_orders')
        .select('id, status')
        .eq('prescription_id', input.prescriptionId)
        .maybeSingle()
      if (duplicate?.id) return { id: duplicate.id, status: duplicate.status as PharmacyOrderStatus }
      throw error
    }

    return { id: data.id, status: data.status as PharmacyOrderStatus }
  }

  async updateOrder(input: PharmacyOrderUpdateInput): Promise<void> {
    const { data: order, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*')
      .eq('id', input.orderId)
      .maybeSingle()
    if (error) throw error
    if (!order) throw new Error('Medicine order not found.')

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = {
      ...(input.patch || {}),
      updated_at: now,
      version: Number(order.version || 1) + 1,
    }

    if (input.nextStatus) {
      assertApolloTransition(order.status, input.nextStatus)
      patch.status = input.nextStatus
      Object.assign(patch, timestampPatch(input.nextStatus, now))
    }

    if (input.expectedVersion && Number(order.version) !== Number(input.expectedVersion)) {
      throw new Error('Order has changed. Refresh before updating.')
    }

    let update = supabaseAdmin.from('pharmacy_orders').update(patch).eq('id', input.orderId)
    if (input.expectedVersion) update = update.eq('version', input.expectedVersion)
    const { data: updatedRows, error: updateError } = await update.select('id')
    if (updateError) throw updateError
    if (!updatedRows?.length) throw new Error('Order has changed. Refresh before updating.')

    if (input.nextStatus) {
      const { error: historyError } = await supabaseAdmin.from('pharmacy_order_status_history').insert({
        pharmacy_order_id: input.orderId,
        previous_status: order.status,
        new_status: input.nextStatus,
        changed_by: input.actorId,
        reason: input.reason || null,
        metadata: input.patch || {},
      })
      if (historyError) throw historyError
    }
  }

  async getOrderStatus(reference: string): Promise<PharmacyOrderStatus> {
    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('status')
      .eq('apollo_order_reference', reference)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Apollo order reference not found.')
    return data.status as PharmacyOrderStatus
  }

  async cancelOrder(reference: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('id, status')
      .eq('apollo_order_reference', reference)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Apollo order reference not found.')
    assertApolloTransition(data.status, 'CANCELLED')
  }
}
