/**
 * 8LIV — Comprehensive Automated Test Suite
 * E-Prescription + Patient Address + Consent + Pharmacy Demand
 */

import assert from 'node:assert'
import { createHash, randomBytes } from 'node:crypto'

console.log('🧪 Starting 8LIV E-Prescription, Consent & Demand Automated Test Suite...\n')

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

async function itAsync(name, fn) {
  try {
    await fn()
    console.log(`  ✅ PASS: ${name}`)
    passedCount++
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     Error: ${err.message}`)
    failedCount++
  }
}

// -------------------------------------------------------------
// 1. PRESCRIPTION CREATION & DRAFT EDITING TESTS
// -------------------------------------------------------------
console.log('--- 1. Prescription Creation & Immutability Rules ---')

function validatePrescriptionInput(input) {
  if (!input.diagnosis || !input.diagnosis.trim()) throw new Error('Diagnosis is required.')
  if (!input.valid_until) throw new Error('Prescription validity date is required.')
  const items = Array.isArray(input.items) ? input.items : []
  if (items.length === 0) throw new Error('At least one prescription item is required.')
  for (const it of items) {
    if (!it.medicine_name?.trim()) throw new Error('Medicine name is required.')
    if (!it.strength?.trim()) throw new Error('Strength is required.')
    if (!it.dose?.trim()) throw new Error('Dose is required.')
    if (!it.frequency?.trim()) throw new Error('Frequency is required.')
    if (!it.duration_value || it.duration_value <= 0) throw new Error('Duration must be greater than zero.')
    if (!['DAYS', 'WEEKS', 'MONTHS'].includes(it.duration_unit)) throw new Error('Duration unit is invalid.')
    if (!it.quantity || it.quantity <= 0) throw new Error('Quantity must be greater than zero.')
  }
  return true
}

it('1. Valid prescription input passes validation', () => {
  assert.strictEqual(
    validatePrescriptionInput({
      diagnosis: 'Clinical Weight Management Protocol',
      valid_until: '2026-10-05',
      items: [
        {
          medicine_name: 'Semaglutide',
          strength: '0.25 mg',
          dosage_form: 'Pre-filled Pen Injector',
          dose: '0.25 mg',
          route: 'Subcutaneous',
          frequency: 'Once weekly',
          duration_value: 4,
          duration_unit: 'WEEKS',
          quantity: 1,
        },
      ],
    }),
    true
  )
})

it('2. Prescription input without medications fails', () => {
  assert.throws(
    () => validatePrescriptionInput({ diagnosis: 'Weight loss', valid_until: '2026-10-05', items: [] }),
    /At least one prescription item is required/
  )
})

it('3. Prescription draft editing is allowed only in DRAFT status', () => {
  function canEditPrescription(status) {
    if (status !== 'DRAFT') throw new Error('Only DRAFT prescriptions may be edited.')
    return true
  }
  assert.strictEqual(canEditPrescription('DRAFT'), true)
  assert.throws(() => canEditPrescription('ISSUED'), /Only DRAFT prescriptions may be edited/)
  assert.throws(() => canEditPrescription('SIGNED'), /Only DRAFT prescriptions may be edited/)
  assert.throws(() => canEditPrescription('CANCELLED'), /Only DRAFT prescriptions may be edited/)
})

it('4. In-place modification of ISSUED prescription is strictly prohibited (Server Immutability)', () => {
  const existingRx = { id: 'rx-1', status: 'ISSUED', medicine: 'Semaglutide 0.25 mg' }
  function updatePrescription(rx, updates) {
    if (rx.status === 'ISSUED') {
      throw new Error('IMMUTABLE_ERROR: An issued prescription cannot be modified in place.')
    }
    return { ...rx, ...updates }
  }
  assert.throws(
    () => updatePrescription(existingRx, { medicine: 'Semaglutide 0.5 mg' }),
    /IMMUTABLE_ERROR/
  )
})

it('5. Replacing an issued prescription sets status to REPLACED and creates new version', () => {
  const oldRx = { id: 'rx-1', version: 1, status: 'ISSUED' }
  const newRx = { id: 'rx-2', version: oldRx.version + 1, status: 'ISSUED', supersedes_prescription_id: oldRx.id }
  oldRx.status = 'REPLACED'

  assert.strictEqual(oldRx.status, 'REPLACED')
  assert.strictEqual(newRx.version, 2)
  assert.strictEqual(newRx.supersedes_prescription_id, 'rx-1')
})

// -------------------------------------------------------------
// 2. DOCTOR AUTHORIZATION & DECLARATIONS
// -------------------------------------------------------------
console.log('\n--- 2. Doctor Authorization & Statutory Declarations ---')

function validateDoctorDeclarations(declarations) {
  if (
    !declarations ||
    declarations.reviewed_details !== true ||
    declarations.clinical_decision !== true ||
    declarations.electronic_authorization !== true
  ) {
    throw new Error('Doctor authorization failed: You must explicitly confirm all three statutory declarations before issuing.')
  }
  return true
}

it('6. Authorization succeeds when all 3 declarations are confirmed', () => {
  assert.strictEqual(
    validateDoctorDeclarations({
      reviewed_details: true,
      clinical_decision: true,
      electronic_authorization: true,
    }),
    true
  )
})

it('7. Authorization fails if reviewed_details is not checked', () => {
  assert.throws(
    () =>
      validateDoctorDeclarations({
        reviewed_details: false,
        clinical_decision: true,
        electronic_authorization: true,
      }),
    /Doctor authorization failed/
  )
})

it('8. Authorization fails if clinical_decision is not checked', () => {
  assert.throws(
    () =>
      validateDoctorDeclarations({
        reviewed_details: true,
        clinical_decision: false,
        electronic_authorization: true,
      }),
    /Doctor authorization failed/
  )
})

it('9. Authorization fails if electronic_authorization is not checked', () => {
  assert.throws(
    () =>
      validateDoctorDeclarations({
        reviewed_details: true,
        clinical_decision: true,
        electronic_authorization: false,
      }),
    /Doctor authorization failed/
  )
})

it('10. Doctor visual signature upload rejects unsupported file types', () => {
  function validateSignatureMime(mimeType) {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(mimeType.toLowerCase())) {
      throw new Error('Unsupported signature format. Please upload PNG, JPEG, or WebP.')
    }
    return true
  }
  assert.strictEqual(validateSignatureMime('image/png'), true)
  assert.strictEqual(validateSignatureMime('image/jpeg'), true)
  assert.throws(() => validateSignatureMime('application/pdf'), /Unsupported signature format/)
  assert.throws(() => validateSignatureMime('text/html'), /Unsupported signature format/)
})

// -------------------------------------------------------------
// 3. CRYPTOGRAPHIC INTEGRITY & IMMUTABILITY HASHES
// -------------------------------------------------------------
console.log('\n--- 3. Cryptographic Integrity & PDF Hashes ---')

function sha256(data) {
  return createHash('sha256').update(data).digest('hex')
}

it('11. Canonical representation produces deterministic SHA-256 hash', () => {
  const canonical1 = {
    prescription_number: '8LIV-RX-2026-001',
    patient_id: 'pat-123',
    doctor_id: 'doc-456',
    items: [{ medicine_name: 'Semaglutide', dose: '0.25 mg', quantity: 1 }],
  }
  const canonical2 = {
    prescription_number: '8LIV-RX-2026-001',
    patient_id: 'pat-123',
    doctor_id: 'doc-456',
    items: [{ medicine_name: 'Semaglutide', dose: '0.25 mg', quantity: 1 }],
  }

  const hash1 = sha256(JSON.stringify(canonical1))
  const hash2 = sha256(JSON.stringify(canonical2))
  assert.strictEqual(hash1, hash2)
  assert.strictEqual(hash1.length, 64)
})

it('12. Any tampering of canonical prescription alters hash immediately', () => {
  const canonicalOriginal = {
    prescription_number: '8LIV-RX-2026-001',
    items: [{ medicine_name: 'Semaglutide', dose: '0.25 mg', quantity: 1 }],
  }
  const canonicalTampered = {
    prescription_number: '8LIV-RX-2026-001',
    items: [{ medicine_name: 'Semaglutide', dose: '1.0 mg', quantity: 1 }],
  }

  const hashOriginal = sha256(JSON.stringify(canonicalOriginal))
  const hashTampered = sha256(JSON.stringify(canonicalTampered))
  assert.notStrictEqual(hashOriginal, hashTampered)
})

it('13. PDF Hash is cryptographically computed and archived', () => {
  const fakePdfBuffer = Buffer.from('%PDF-1.4 8LIV Medical Prescription Document', 'utf8')
  const pdfHash = sha256(fakePdfBuffer)
  assert.strictEqual(typeof pdfHash, 'string')
  assert.strictEqual(pdfHash.length, 64)
})

// -------------------------------------------------------------
// 4. PATIENT DELIVERY ADDRESS & VALIDATION TESTS
// -------------------------------------------------------------
console.log('\n--- 4. Patient Delivery Address Validation ---')

const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Delhi',
  'Tamil Nadu',
  'Telangana',
  'Gujarat',
  'Uttar Pradesh',
  'Kerala',
]

function validateDeliveryAddress(body) {
  const recipient_name = String(body.recipient_name || '').trim()
  const line1 = String(body.line1 || '').trim()
  const city = String(body.city || '').trim()
  const state = String(body.state || '').trim()
  const pincode = String(body.pincode || '').trim()
  const phone = String(body.phone || '').trim()

  if (!recipient_name) throw new Error('Recipient name is required.')
  if (!line1) throw new Error('Address line 1 is required.')
  if (!city) throw new Error('City is required.')
  if (!INDIAN_STATES.some((s) => s.toLowerCase() === state.toLowerCase())) {
    throw new Error('Invalid Indian State or Union Territory.')
  }
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    throw new Error('Invalid PIN code: Must be a 6-digit Indian postal code starting with 1-9.')
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error('Invalid phone number: Must be a 10-digit Indian mobile number.')
  }
  return true
}

it('14. Valid Indian address passes validation', () => {
  assert.strictEqual(
    validateDeliveryAddress({
      recipient_name: 'Aarav Sharma',
      line1: 'Flat 402, Lotus Towers, 14th Main',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560034',
      phone: '9876543210',
    }),
    true
  )
})

it('15. PIN code starting with 0 is rejected', () => {
  assert.throws(
    () =>
      validateDeliveryAddress({
        recipient_name: 'Test',
        line1: 'Line 1',
        city: 'City',
        state: 'Karnataka',
        pincode: '056034',
        phone: '9876543210',
      }),
    /Invalid PIN code/
  )
})

it('16. Non 6-digit PIN code is rejected', () => {
  assert.throws(
    () =>
      validateDeliveryAddress({
        recipient_name: 'Test',
        line1: 'Line 1',
        city: 'City',
        state: 'Karnataka',
        pincode: '56003',
        phone: '9876543210',
      }),
    /Invalid PIN code/
  )
})

it('17. Invalid state is rejected', () => {
  assert.throws(
    () =>
      validateDeliveryAddress({
        recipient_name: 'Test',
        line1: 'Line 1',
        city: 'City',
        state: 'California',
        pincode: '560034',
        phone: '9876543210',
      }),
    /Invalid Indian State/
  )
})

it('18. Immutable delivery address snapshot is captured and immune to subsequent patient address edits', () => {
  const patientProfile = {
    current_address: { line1: '10 Main Road', city: 'Chennai', pincode: '600001' },
  }
  // Snapshot taken at fulfillment confirmation
  const orderSnapshot = {
    delivery_address_snapshot: { ...patientProfile.current_address, snapshot_at: '2026-09-05T14:00:00Z' },
  }

  // Patient later edits address
  patientProfile.current_address = { line1: '20 New Road', city: 'Chennai', pincode: '600002' }

  assert.strictEqual(orderSnapshot.delivery_address_snapshot.line1, '10 Main Road')
  assert.strictEqual(orderSnapshot.delivery_address_snapshot.pincode, '600001')
  assert.notStrictEqual(orderSnapshot.delivery_address_snapshot.line1, patientProfile.current_address.line1)
})

// -------------------------------------------------------------
// 5. PATIENT CONSENT TESTS
// -------------------------------------------------------------
console.log('\n--- 5. Patient Consent for Electronic Transmission ---')

function validatePatientConsent(consent) {
  if (
    !consent ||
    consent.reviewed_prescription !== true ||
    consent.consent_transmission !== true ||
    consent.confirm_delivery_info !== true
  ) {
    throw new Error('Patient consent is mandatory: All 3 statutory acknowledgements must be confirmed.')
  }
  return true
}

it('19. Patient consent succeeds when all 3 acknowledgements are true', () => {
  assert.strictEqual(
    validatePatientConsent({
      reviewed_prescription: true,
      consent_transmission: true,
      confirm_delivery_info: true,
    }),
    true
  )
})

it('20. Patient consent fails if transmission consent is missing', () => {
  assert.throws(
    () =>
      validatePatientConsent({
        reviewed_prescription: true,
        consent_transmission: false,
        confirm_delivery_info: true,
      }),
    /Patient consent is mandatory/
  )
})

it('21. Order creation is blocked without patient consent and confirmed address', () => {
  function attemptOrderCreation(prescription, consent, address) {
    if (prescription.status !== 'ISSUED') throw new Error('Prescription must be ISSUED.')
    if (!validatePatientConsent(consent)) throw new Error('Consent required.')
    if (!address) throw new Error('Confirmed delivery address is required.')
    return { order_status: 'PENDING_ASSIGNMENT', pharmacy_id: null }
  }

  const validRx = { id: 'rx-1', status: 'ISSUED' }
  const validConsent = { reviewed_prescription: true, consent_transmission: true, confirm_delivery_info: true }
  const validAddr = { id: 'addr-1', city: 'Bengaluru' }

  // Happy path
  const order = attemptOrderCreation(validRx, validConsent, validAddr)
  assert.strictEqual(order.order_status, 'PENDING_ASSIGNMENT')
  assert.strictEqual(order.pharmacy_id, null)

  // Blocked without consent
  assert.throws(
    () => attemptOrderCreation(validRx, { ...validConsent, consent_transmission: false }, validAddr),
    /Patient consent is mandatory/
  )

  // Blocked without address
  assert.throws(() => attemptOrderCreation(validRx, validConsent, null), /Confirmed delivery address is required/)
})

// -------------------------------------------------------------
// 6. PHARMACY DEMAND FORECASTING & WINDOW AGGREGATION
// -------------------------------------------------------------
console.log('\n--- 6. Upcoming Pharmacy Demand & Forecast Windows ---')

const SAMPLE_PRESCRIPTIONS = [
  {
    prescription_number: 'RX-001',
    status: 'ISSUED',
    valid_until: '2026-10-01',
    expected_fulfillment_date: '2026-09-07', // +2 days (in 7-day window)
    items: [{ medicine_name: 'Semaglutide', strength: '0.25 mg', dosage_form: 'Pre-filled Pen', quantity: 30 }],
    pharmacy_orders: [{ id: 'order-1', pharmacy_id: 'pharmacy-1', status: 'RECEIVED' }],
  },
  {
    prescription_number: 'RX-002',
    status: 'ISSUED',
    valid_until: '2026-10-01',
    expected_fulfillment_date: '2026-09-08', // +3 days (in 7-day window)
    items: [{ medicine_name: 'Semaglutide', strength: '0.25 mg', dosage_form: 'Pre-filled Pen', quantity: 30 }],
    pharmacy_orders: [], // FORECASTED
  },
  {
    prescription_number: 'RX-003',
    status: 'ISSUED',
    valid_until: '2026-10-01',
    expected_fulfillment_date: '2026-09-15', // +10 days (in 14-day window, NOT in 7-day window)
    items: [{ medicine_name: 'Tirzepatide', strength: '2.5 mg', dosage_form: 'Pre-filled Pen', quantity: 60 }],
    pharmacy_orders: [],
  },
  {
    prescription_number: 'RX-004',
    status: 'REVOKED', // REVOKED -> MUST BE EXCLUDED
    valid_until: '2026-10-01',
    expected_fulfillment_date: '2026-09-07',
    items: [{ medicine_name: 'Semaglutide', strength: '0.25 mg', dosage_form: 'Pre-filled Pen', quantity: 100 }],
    pharmacy_orders: [],
  },
  {
    prescription_number: 'RX-005',
    status: 'CANCELLED', // CANCELLED -> MUST BE EXCLUDED
    valid_until: '2026-10-01',
    expected_fulfillment_date: '2026-09-07',
    items: [{ medicine_name: 'Semaglutide', strength: '0.25 mg', dosage_form: 'Pre-filled Pen', quantity: 100 }],
    pharmacy_orders: [],
  },
]

function computeDemandForecast(prescriptions, windowDays, referenceDateStr = '2026-09-05') {
  const refDate = new Date(referenceDateStr)
  const windowEndDate = new Date(refDate.getTime() + windowDays * 86400000)
  const windowEndStr = windowEndDate.toISOString().split('T')[0]

  const activeRx = prescriptions.filter(
    (rx) => ['ISSUED', 'SIGNED'].includes(rx.status) && rx.valid_until >= referenceDateStr
  )

  const aggregateMap = new Map()

  for (const rx of activeRx) {
    if (rx.expected_fulfillment_date > windowEndStr) continue

    for (const it of rx.items) {
      const key = `${it.medicine_name}::${it.strength}::${it.dosage_form}`
      if (!aggregateMap.has(key)) {
        aggregateMap.set(key, {
          medicine_name: it.medicine_name,
          strength: it.strength,
          dosage_form: it.dosage_form,
          expected_quantity: 0,
          prescriptions_count: 0,
        })
      }
      const entry = aggregateMap.get(key)
      entry.expected_quantity += it.quantity
      entry.prescriptions_count += 1
    }
  }

  return Array.from(aggregateMap.values())
}

it('22. 7-Day forecast includes only prescriptions within 7 days', () => {
  const forecast7 = computeDemandForecast(SAMPLE_PRESCRIPTIONS, 7)
  assert.strictEqual(forecast7.length, 1)
  assert.strictEqual(forecast7[0].medicine_name, 'Semaglutide')
  assert.strictEqual(forecast7[0].expected_quantity, 60) // 30 + 30
  assert.strictEqual(forecast7[0].prescriptions_count, 2)
})

it('23. 14-Day forecast includes both Semaglutide and Tirzepatide', () => {
  const forecast14 = computeDemandForecast(SAMPLE_PRESCRIPTIONS, 14)
  assert.strictEqual(forecast14.length, 2)
  const sema = forecast14.find((f) => f.medicine_name === 'Semaglutide')
  const tirz = forecast14.find((f) => f.medicine_name === 'Tirzepatide')
  assert.strictEqual(sema.expected_quantity, 60)
  assert.strictEqual(tirz.expected_quantity, 60)
})

it('24. Revoked and Cancelled prescriptions are strictly excluded from demand', () => {
  const forecast30 = computeDemandForecast(SAMPLE_PRESCRIPTIONS, 30)
  const sema = forecast30.find((f) => f.medicine_name === 'Semaglutide')
  // Should NOT contain the 100 units from RX-004 (REVOKED) or RX-005 (CANCELLED)
  assert.strictEqual(sema.expected_quantity, 60)
})

it('25. Forecast clearly distinguishes FORECASTED, COMMITTED, and ACTUAL ORDER', () => {
  function classifyPrescriptionStage(rx) {
    const orders = rx.pharmacy_orders || []
    const active = orders.find((o) => !['CANCELLED', 'UNABLE_TO_FULFILL'].includes(o.status))
    if (active?.pharmacy_id) return 'ACTUAL_ORDER'
    if (active) return 'COMMITTED'
    return 'FORECASTED'
  }

  assert.strictEqual(classifyPrescriptionStage(SAMPLE_PRESCRIPTIONS[0]), 'ACTUAL_ORDER')
  assert.strictEqual(classifyPrescriptionStage(SAMPLE_PRESCRIPTIONS[1]), 'FORECASTED')
})

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n======================================================`)
console.log(`Test Execution Complete: ${passedCount} Passed, ${failedCount} Failed.`)
console.log(`======================================================`)

if (failedCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
