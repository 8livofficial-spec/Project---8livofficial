import { supabaseAdmin } from './supabaseServer'
import { getAuthenticatedUser } from './apiSecurity'

export type PharmacyAccessContext = {
  user: { id: string; email?: string | null }
  role: string
  pharmacy: {
    id: string
    name: string
    legal_entity_name?: string | null
    drug_license_number: string
    drug_license_type?: string | null
    drug_license_expiry?: string | null
    pharmacist_name?: string | null
    pharmacist_registration_number?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    verification_status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'SUSPENDED'
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    tenant_id?: string | null
  }
  pharmacyUser?: {
    id: string
    pharmacy_id: string
    user_id: string
    role: 'PHARMACY_ADMIN' | 'PHARMACY_STAFF'
    status: 'ACTIVE' | 'INACTIVE'
  } | null
  isAdmin: boolean
}

/**
 * Server-side Pharmacy Access Control
 * Enforces:
 * 1. Authenticated user
 * 2. User role (PHARMACY_ADMIN, PHARMACY_STAFF, or ADMIN)
 * 3. Pharmacy association
 * 4. Pharmacy verification status === 'VERIFIED'
 * 5. Pharmacy operational status === 'ACTIVE'
 * 
 * Rejects unverified / inactive pharmacies with HTTP 403.
 */
export async function assertPharmacyStaff(request: Request): Promise<PharmacyAccessContext> {
  const auth = await getAuthenticatedUser(request)
  if (!auth) {
    const err = new Error('Unauthorized')
    ;(err as any).status = 401
    throw err
  }

  // Admin access bypass for platform pharmacy management
  if (auth.role === 'admin') {
    // If admin requested a specific pharmacy header, load it, otherwise use a placeholder
    const pharmacyIdHeader = request.headers.get('x-pharmacy-id')
    let adminPharmacy: any = null
    if (pharmacyIdHeader) {
      const { data } = await supabaseAdmin
        .from('partner_pharmacies')
        .select('*')
        .eq('id', pharmacyIdHeader)
        .maybeSingle()
      adminPharmacy = data
    }

    return {
      user: auth.user,
      role: 'admin',
      pharmacy: adminPharmacy || {
        id: 'admin-preview',
        name: 'Admin Operational View',
        drug_license_number: 'ADMIN-OVERRIDE',
        verification_status: 'VERIFIED',
        status: 'ACTIVE',
      },
      pharmacyUser: null,
      isAdmin: true,
    }
  }

  // Check role in profiles or partner_pharmacy_users
  const userRole = String(auth.role || '').toUpperCase()
  const isPharmacyRole = ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'PHARMACIST'].includes(userRole)

  // Find partner_pharmacy_users association
  const { data: pharmacyUser, error: puError } = await supabaseAdmin
    .from('partner_pharmacy_users')
    .select('id, pharmacy_id, user_id, role, status')
    .eq('user_id', auth.user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (puError) {
    console.error('[pharmacySecurity] Query error on partner_pharmacy_users:', puError)
  }

  let pharmacyId = pharmacyUser?.pharmacy_id

  // Fallback: check if pharmacy_id is stored in profiles metadata or user_profiles
  if (!pharmacyId && isPharmacyRole) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (profile?.pharmacy_id) {
      pharmacyId = profile.pharmacy_id
    }
  }

  if (!pharmacyId) {
    const err = new Error('Forbidden: No active pharmacy association found for this user account.')
    ;(err as any).status = 403
    throw err
  }

  // Load pharmacy record
  const { data: pharmacy, error: pError } = await supabaseAdmin
    .from('partner_pharmacies')
    .select('*')
    .eq('id', pharmacyId)
    .maybeSingle()

  if (pError || !pharmacy) {
    const err = new Error('Forbidden: Associated pharmacy record does not exist.')
    ;(err as any).status = 403
    throw err
  }

  // Mandatory verification check
  if (pharmacy.verification_status !== 'VERIFIED') {
    const err = new Error(
      `Forbidden: Partner pharmacy verification is ${pharmacy.verification_status}. Only VERIFIED pharmacies may access fulfillment orders.`
    )
    ;(err as any).status = 403
    ;(err as any).verification_status = pharmacy.verification_status
    throw err
  }

  // Mandatory operational status check
  if (pharmacy.status !== 'ACTIVE') {
    const err = new Error(
      `Forbidden: Partner pharmacy status is ${pharmacy.status}. Only ACTIVE pharmacies may access fulfillment orders.`
    )
    ;(err as any).status = 403
    ;(err as any).operational_status = pharmacy.status
    throw err
  }

  return {
    user: auth.user,
    role: pharmacyUser?.role || 'PHARMACY_STAFF',
    pharmacy,
    pharmacyUser: pharmacyUser || null,
    isAdmin: false,
  }
}

/**
 * Validate that an order belongs to the authenticated pharmacy.
 * Pharmacy A must NEVER access Pharmacy B's orders (Tenant / Pharmacy Isolation).
 */
export async function assertPharmacyOrderAccess(request: Request, orderId: string) {
  const context = await assertPharmacyStaff(request)

  const { data: order, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('*, prescriptions(*, prescription_items(*))')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    const err = new Error('Fulfillment order not found.')
    ;(err as any).status = 404
    throw err
  }

  // If not platform admin, enforce strict pharmacy tenancy
  if (!context.isAdmin) {
    // If order has a designated pharmacy_id, must match context.pharmacy.id
    if (order.pharmacy_id && order.pharmacy_id !== context.pharmacy.id) {
      const err = new Error('Forbidden: Access denied to orders assigned to another pharmacy.')
      ;(err as any).status = 403
      throw err
    }
  }

  return {
    ...context,
    order,
  }
}
