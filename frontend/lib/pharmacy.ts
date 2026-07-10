import { supabaseAdmin } from './supabaseServer'
import { getAuthenticatedUser } from './apiSecurity'

export const PHARMACY_ROLES = ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'DELIVERY_PARTNER', 'ADMIN'] as const
export const PHARMACY_ORDER_STATUSES = [
  'PRESCRIPTION_CREATED',
  'ORDER_PLACED',
  'PAYMENT_PENDING',
  'PAYMENT_COMPLETED',
  'PHARMACY_ACCEPTED',
  'PREPARING',
  'PACKED',
  'READY_FOR_DISPATCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const

export type PharmacyRole = typeof PHARMACY_ROLES[number]
export type PharmacyOrderStatus = typeof PHARMACY_ORDER_STATUSES[number]

export type PharmacyAuth = {
  user: { id: string; email?: string | null }
  role: PharmacyRole
  pharmacyId: string | null
}

const statusTransitions: Record<PharmacyOrderStatus, PharmacyOrderStatus[]> = {
  PRESCRIPTION_CREATED: ['ORDER_PLACED', 'CANCELLED'],
  ORDER_PLACED: ['PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'PHARMACY_ACCEPTED', 'CANCELLED'],
  PAYMENT_PENDING: ['PAYMENT_COMPLETED', 'CANCELLED'],
  PAYMENT_COMPLETED: ['PHARMACY_ACCEPTED', 'REFUNDED', 'CANCELLED'],
  PHARMACY_ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['PACKED', 'CANCELLED'],
  PACKED: ['READY_FOR_DISPATCH'],
  READY_FOR_DISPATCH: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'READY_FOR_DISPATCH'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
}

export function normalizePharmacyRole(role?: string | null): PharmacyRole | null {
  const normalized = String(role || '').trim().toUpperCase()
  if (normalized === 'ADMIN') return 'ADMIN'
  return PHARMACY_ROLES.find((allowed) => allowed === normalized) || null
}

export function isValidPharmacyStatus(value: unknown): value is PharmacyOrderStatus {
  return PHARMACY_ORDER_STATUSES.includes(String(value || '') as PharmacyOrderStatus)
}

export function assertPharmacyTransition(from: string, to: string) {
  if (!isValidPharmacyStatus(from) || !isValidPharmacyStatus(to)) {
    throw new Error('Invalid pharmacy order status.')
  }
  if (!statusTransitions[from].includes(to)) {
    throw new Error(`Invalid transition from ${from} to ${to}.`)
  }
}

export function getOrderNumber() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `8LIV-RX-${stamp}-${random}`
}

export function getTimestampPatch(status: PharmacyOrderStatus, now = new Date().toISOString()) {
  const key = status.toLowerCase()
  return {
    status,
    updated_at: now,
    [`${key}_at`]: now,
  }
}

export async function assertPharmacyAccess(request: Request, allowedRoles: PharmacyRole[] = [...PHARMACY_ROLES]) {
  const auth = await getAuthenticatedUser(request)
  if (!auth) throw new Error('Unauthorized')

  const baseRole = normalizePharmacyRole(auth.role)
  if (baseRole === 'ADMIN') {
    if (!allowedRoles.includes('ADMIN')) throw new Error('Forbidden')
    return { user: auth.user, role: 'ADMIN', pharmacyId: null } satisfies PharmacyAuth
  }

  const { data: pharmacyUser, error } = await supabaseAdmin
    .from('pharmacy_users')
    .select('pharmacy_id, role, status')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) throw error

  const pharmacyRole = normalizePharmacyRole(pharmacyUser?.role || auth.role)
  if (!pharmacyRole || !allowedRoles.includes(pharmacyRole) || pharmacyUser?.status !== 'ACTIVE') {
    throw new Error('Forbidden')
  }

  return {
    user: auth.user,
    role: pharmacyRole,
    pharmacyId: pharmacyUser?.pharmacy_id || null,
  } satisfies PharmacyAuth
}

export async function assertPatientAccess(request: Request) {
  const auth = await getAuthenticatedUser(request)
  if (!auth) throw new Error('Unauthorized')
  if (auth.role !== 'patient' && auth.role !== 'admin') throw new Error('Forbidden')
  return auth
}

export async function logPharmacyAudit(input: {
  actorId: string
  actorRole: string
  action: string
  targetType: string
  targetId?: string | null
  pharmacyId?: string | null
  metadata?: Record<string, unknown>
  request?: Request
}) {
  const ipAddress = input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || input.request?.headers.get('x-real-ip')
    || null

  const { error } = await supabaseAdmin
    .from('pharmacy_audit_logs')
    .insert({
      pharmacy_id: input.pharmacyId || null,
      actor_id: input.actorId,
      actor_role: input.actorRole,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId || null,
      ip_address: ipAddress,
      metadata: input.metadata || {},
    })

  if (error) console.error('[pharmacy-audit-log-error]', error)
}

export async function createPatientNotification(patientId: string, title: string, message: string, type = 'pharmacy') {
  const { error } = await supabaseAdmin
    .from('patient_notifications')
    .insert({ patient_id: patientId, type, title, message, is_read: false })

  if (error) console.error('[pharmacy-notification-error]', error)
}

export function parsePagination(url: string) {
  const params = new URL(url).searchParams
  const page = Math.max(1, Number(params.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25)))
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { params, page, limit, from, to }
}
