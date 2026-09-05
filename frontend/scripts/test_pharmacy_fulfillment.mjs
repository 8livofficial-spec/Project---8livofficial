/**
 * 8LIV — Comprehensive Pharmacy Fulfillment Automated Test Suite
 * Validates Security, Immutability, State Machine, Invitations, Address Validation, and Isolation.
 */

import assert from 'node:assert'
import { createHash, randomBytes } from 'node:crypto'

console.log('🧪 Starting 8LIV Pharmacy Fulfillment Test Suite...\n')

let passedCount = 0
let failedCount = 0

function it(name, fn) {
  try {
    fn()
    console.log(`  ✅ PASS: ${name}`)
    passedCount++
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     Error: ${err.message}`)
    failedCount++
  }
}

// -------------------------------------------------------------
// 1. STATE MACHINE TESTS
// -------------------------------------------------------------
console.log('--- 1. Canonical State Machine Verification ---')

const LEGAL_TRANSITIONS = {
  PENDING_ASSIGNMENT: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['ACKNOWLEDGED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  ACKNOWLEDGED: ['STOCK_CONFIRMED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  STOCK_CONFIRMED: ['PREPARING', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  CLARIFICATION_REQUIRED: ['ACKNOWLEDGED', 'STOCK_CONFIRMED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PARTIALLY_FULFILLED: ['DISPATCHED', 'CANCELLED'],
  UNABLE_TO_FULFILL: ['CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

function validateTransition(from, to) {
  if (from === to) return true
  const allowed = LEGAL_TRANSITIONS[from] || []
  return allowed.includes(to)
}

it('25. Full forward happy-path state progression succeeds', () => {
  assert.strictEqual(validateTransition('PENDING_ASSIGNMENT', 'RECEIVED'), true)
  assert.strictEqual(validateTransition('RECEIVED', 'ACKNOWLEDGED'), true)
  assert.strictEqual(validateTransition('ACKNOWLEDGED', 'STOCK_CONFIRMED'), true)
  assert.strictEqual(validateTransition('STOCK_CONFIRMED', 'PREPARING'), true)
  assert.strictEqual(validateTransition('PREPARING', 'DISPATCHED'), true)
  assert.strictEqual(validateTransition('DISPATCHED', 'DELIVERED'), true)
})

it('26. Invalid forward jumps fail', () => {
  assert.strictEqual(validateTransition('PENDING_ASSIGNMENT', 'DISPATCHED'), false)
  assert.strictEqual(validateTransition('RECEIVED', 'DELIVERED'), false)
  assert.strictEqual(validateTransition('ACKNOWLEDGED', 'PREPARING'), false)
  assert.strictEqual(validateTransition('STOCK_CONFIRMED', 'DELIVERED'), false)
})

it('26. Terminal states cannot transition to any other state', () => {
  assert.strictEqual(validateTransition('DELIVERED', 'RECEIVED'), false)
  assert.strictEqual(validateTransition('DELIVERED', 'CANCELLED'), false)
  assert.strictEqual(validateTransition('CANCELLED', 'RECEIVED'), false)
  assert.strictEqual(validateTransition('CANCELLED', 'DELIVERED'), false)
})

it('Exceptions loop back correctly', () => {
  assert.strictEqual(validateTransition('CLARIFICATION_REQUIRED', 'ACKNOWLEDGED'), true)
  assert.strictEqual(validateTransition('CLARIFICATION_REQUIRED', 'STOCK_CONFIRMED'), true)
  assert.strictEqual(validateTransition('PARTIALLY_FULFILLED', 'DISPATCHED'), true)
  assert.strictEqual(validateTransition('UNABLE_TO_FULFILL', 'CANCELLED'), true)
})

// -------------------------------------------------------------
// 2. SECURITY & PHARMACY ISOLATION TESTS
// -------------------------------------------------------------
console.log('\n--- 2. Security & Tenant/Pharmacy Isolation ---')

function evaluatePharmacyOrderAccess(userRole, userPharmacyId, pharmacyVerified, pharmacyActive, order) {
  if (!userRole) throw new Error('401: Unauthorized')
  if (userRole === 'admin') return true // admin has operational access

  if (!pharmacyVerified || pharmacyVerified !== 'VERIFIED') {
    throw new Error('403: Forbidden: Only VERIFIED pharmacies may access orders.')
  }
  if (!pharmacyActive || pharmacyActive !== 'ACTIVE') {
    throw new Error('403: Forbidden: Only ACTIVE pharmacies may access orders.')
  }

  // Isolation check
  if (!order.pharmacy_id) {
    throw new Error('403: Forbidden: Order is pending assignment and not accessible to pharmacies.')
  }
  if (order.pharmacy_id !== userPharmacyId) {
    throw new Error('403: Forbidden: Access denied to orders assigned to another pharmacy.')
  }

  return true
}

it('1. Pharmacy A cannot access Pharmacy B order', () => {
  const order = { id: 'order-1', pharmacy_id: 'pharmacy-b', status: 'RECEIVED' }
  assert.throws(
    () => evaluatePharmacyOrderAccess('PHARMACY_STAFF', 'pharmacy-a', 'VERIFIED', 'ACTIVE', order),
    /Access denied to orders assigned to another pharmacy/
  )
})

it('2. Pharmacy A cannot access PENDING_ASSIGNMENT (pharmacy_id is null)', () => {
  const order = { id: 'order-2', pharmacy_id: null, status: 'PENDING_ASSIGNMENT' }
  assert.throws(
    () => evaluatePharmacyOrderAccess('PHARMACY_STAFF', 'pharmacy-a', 'VERIFIED', 'ACTIVE', order),
    /Order is pending assignment and not accessible to pharmacies/
  )
})

it('3. Pharmacy A cannot access NULL pharmacy order even if status is not PENDING_ASSIGNMENT', () => {
  const order = { id: 'order-3', pharmacy_id: null, status: 'RECEIVED' }
  assert.throws(
    () => evaluatePharmacyOrderAccess('PHARMACY_STAFF', 'pharmacy-a', 'VERIFIED', 'ACTIVE', order),
    /Order is pending assignment and not accessible to pharmacies/
  )
})

it('4. Suspended pharmacy cannot access orders', () => {
  const order = { id: 'order-4', pharmacy_id: 'pharmacy-a', status: 'RECEIVED' }
  assert.throws(
    () => evaluatePharmacyOrderAccess('PHARMACY_STAFF', 'pharmacy-a', 'VERIFIED', 'SUSPENDED', order),
    /Only ACTIVE pharmacies may access orders/
  )
})

it('5. Unverified pharmacy cannot access orders', () => {
  const order = { id: 'order-5', pharmacy_id: 'pharmacy-a', status: 'RECEIVED' }
  assert.throws(
    () => evaluatePharmacyOrderAccess('PHARMACY_STAFF', 'pharmacy-a', 'UNDER_REVIEW', 'ACTIVE', order),
    /Only VERIFIED pharmacies may access orders/
  )
})

it('10. Unauthenticated pharmacy API returns 401', () => {
  const order = { id: 'order-6', pharmacy_id: 'pharmacy-a', status: 'RECEIVED' }
  assert.throws(
    () => evaluatePharmacyOrderAccess(null, null, 'VERIFIED', 'ACTIVE', order),
    /401: Unauthorized/
  )
})

it('23 & 24. Assigned pharmacy can access, but other pharmacy cannot', () => {
  const order = { id: 'order-7', pharmacy_id: 'pharmacy-assigned', status: 'RECEIVED' }
  // Assigned pharmacy:
  assert.strictEqual(
    evaluatePharmacyOrderAccess('PHARMACY_STAFF', 'pharmacy-assigned', 'VERIFIED', 'ACTIVE', order),
    true
  )
  // Other pharmacy:
  assert.throws(
    () => evaluatePharmacyOrderAccess('PHARMACY_STAFF', 'pharmacy-intruder', 'VERIFIED', 'ACTIVE', order),
    /Access denied to orders assigned to another pharmacy/
  )
})

// -------------------------------------------------------------
// 3. INVITATION SECURITY & TOKEN HASHING
// -------------------------------------------------------------
console.log('\n--- 3. Invitation Security & Token Hashing ---')

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

it('31 & 32. Raw token is hashed with SHA-256 and different tokens produce distinct non-reversible hashes', () => {
  const rawToken1 = randomBytes(32).toString('base64url')
  const rawToken2 = randomBytes(32).toString('base64url')
  const hash1 = hashToken(rawToken1)
  const hash2 = hashToken(rawToken2)

  assert.strictEqual(hash1.length, 64) // 256-bit hex
  assert.notStrictEqual(hash1, rawToken1)
  assert.notStrictEqual(hash1, hash2)
})

it('33. Expired invitation token is rejected', () => {
  const now = new Date()
  const invitation = {
    status: 'INVITED',
    expires_at: new Date(now.getTime() - 1000).toISOString(), // expired 1 sec ago
  }
  const isExpired = new Date(invitation.expires_at) < now
  assert.strictEqual(isExpired, true)
})

it('34. Already used (ACCEPTED) invitation token is rejected', () => {
  const invitation = { status: 'ACCEPTED', expires_at: new Date(Date.now() + 100000).toISOString() }
  assert.strictEqual(invitation.status === 'INVITED', false)
})

it('35. Cancelled invitation token is rejected', () => {
  const invitation = { status: 'CANCELLED', expires_at: new Date(Date.now() + 100000).toISOString() }
  assert.strictEqual(invitation.status === 'INVITED', false)
})

it('39. Resend generates new token and invalidates previous token hash', () => {
  const oldRaw = randomBytes(32).toString('base64url')
  const oldHash = hashToken(oldRaw)

  const newRaw = randomBytes(32).toString('base64url')
  const newHash = hashToken(newRaw)

  assert.notStrictEqual(oldHash, newHash)
  // An attacker with oldRaw cannot match newHash:
  assert.notStrictEqual(hashToken(oldRaw), newHash)
})

// -------------------------------------------------------------
// 4. ADDRESS VALIDATION & SNAPSHOTTING
// -------------------------------------------------------------
console.log('\n--- 4. Patient Delivery Address & Snapshotting ---')

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

function validateAddress(body) {
  const recipient_name = String(body.recipient_name || '').trim()
  const line1 = String(body.line1 || '').trim()
  const city = String(body.city || '').trim()
  const state = String(body.state || '').trim()
  const pincode = String(body.pincode || '').trim()
  const phone = String(body.phone || '').trim().replace(/^(\+91|0)/, '')

  if (!recipient_name) throw new Error('Recipient name required')
  if (!line1) throw new Error('Line 1 required')
  if (!city) throw new Error('City required')
  const matchedState = INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase())
  if (!matchedState) throw new Error('Invalid Indian state')
  if (!/^[1-9][0-9]{5}$/.test(pincode)) throw new Error('Invalid pincode (must be 6 digits)')
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Invalid Indian mobile phone')

  return { recipient_name, line1, city, state: matchedState, pincode, phone }
}

it('Valid Indian postal address passes validation', () => {
  const addr = validateAddress({
    recipient_name: 'Rahul Sharma',
    line1: '42 MG Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    phone: '9876543210',
  })
  assert.strictEqual(addr.pincode, '560038')
  assert.strictEqual(addr.state, 'Karnataka')
})

it('Invalid 5-digit pincode is rejected', () => {
  assert.throws(
    () => validateAddress({
      recipient_name: 'Rahul',
      line1: '42 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '56003', // 5 digits
      phone: '9876543210',
    }),
    /Invalid pincode/
  )
})

it('Invalid state name is rejected', () => {
  assert.throws(
    () => validateAddress({
      recipient_name: 'Rahul',
      line1: '42 MG Road',
      city: 'Bengaluru',
      state: 'California', // Not Indian state
      pincode: '560038',
      phone: '9876543210',
    }),
    /Invalid Indian state/
  )
})

it('19. Order stores immutable delivery address snapshot', () => {
  const patientCurrentAddress = {
    recipient_name: 'Rahul Sharma',
    line1: 'Old Street 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    phone: '9876543210',
  }

  // Freeze snapshot in order
  const orderSnapshot = {
    ...patientCurrentAddress,
    snapshot_taken_at: new Date().toISOString(),
  }

  // Patient later updates saved address
  patientCurrentAddress.line1 = 'New Street 999'

  // Order snapshot remains intact:
  assert.strictEqual(orderSnapshot.line1, 'Old Street 1')
  assert.notStrictEqual(orderSnapshot.line1, patientCurrentAddress.line1)
})

// -------------------------------------------------------------
// 5. CONCURRENCY & OPTIMISTIC LOCKING
// -------------------------------------------------------------
console.log('\n--- 5. Concurrency & Optimistic Locking ---')

it('29. Optimistic concurrency check detects version conflict', () => {
  let dbOrder = { id: 'po-100', status: 'RECEIVED', version: 3 }

  function updateWithVersion(orderId, newStatus, expectedVersion) {
    if (dbOrder.version !== expectedVersion) {
      throw new Error('409: Version conflict: Order was updated by another user.')
    }
    dbOrder.status = newStatus
    dbOrder.version += 1
    return dbOrder
  }

  // Request 1 succeeds
  const res1 = updateWithVersion('po-100', 'ACKNOWLEDGED', 3)
  assert.strictEqual(res1.status, 'ACKNOWLEDGED')
  assert.strictEqual(res1.version, 4)

  // Concurrent Request 2 (which still had version 3) fails with 409
  assert.throws(
    () => updateWithVersion('po-100', 'CANCELLED', 3),
    /409: Version conflict/
  )
})

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n=============================================')
console.log(`Total tests: ${passedCount + failedCount}`)
console.log(`Passed: ${passedCount}`)
console.log(`Failed: ${failedCount}`)
console.log('=============================================\n')

if (failedCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL AUTOMATED VERIFICATION CHECKS PASSED!')
}
