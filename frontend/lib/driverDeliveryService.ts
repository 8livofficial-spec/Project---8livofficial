import crypto from 'crypto'
import { supabaseAdmin } from './supabaseServer'
import { emailService } from './emailService'
import { audit } from './prescriptionService'
import { WhatsAppNotificationService } from './whatsapp/whatsappNotificationService'

export type InHouseDeliveryMeta = {
  delivery_mode?: 'IN_HOUSE' | 'COURIER'
  driver_name?: string | null
  driver_phone?: string | null
  delivery_slot?: string | null
  run_ref?: string | null
  delivery_otp?: string | null
  otp_generated_at?: string | null
  otp_expires_at?: string | null
  driver_arrived_at?: string | null
  otp_verified_at?: string | null
  delivered_by?: string | null
  notes?: string | null
}

export function parseDeliveryMeta(internalNotes?: string | null): InHouseDeliveryMeta {
  if (!internalNotes) return {}
  try {
    const parsed = JSON.parse(internalNotes)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as InHouseDeliveryMeta
    }
  } catch {
    // If internalNotes is legacy plain text, wrap it
    return { notes: internalNotes }
  }
  return {}
}

export function serializeDeliveryMeta(existingNotes: string | null | undefined, update: Partial<InHouseDeliveryMeta>): string {
  const current = parseDeliveryMeta(existingNotes)
  const merged = { ...current, ...update }
  return JSON.stringify(merged)
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateDeliveryOtp(): string {
  const num = crypto.randomInt(100000, 999999)
  return num.toString()
}

/**
 * Formats a clean destination string for Google Maps navigation
 */
export function formatAddressForNavigation(address: any): string {
  if (!address) return 'India'
  if (typeof address === 'string') return address
  const parts = [
    address.line1 || address.address_line1,
    address.line2,
    address.area,
    address.city,
    address.state,
    address.pincode || address.postal_code,
  ].filter(Boolean)
  return parts.join(', ')
}

/**
 * Creates Google Maps navigation and view URLs
 */
export function buildMapUrls(addressStr: string) {
  const encoded = encodeURIComponent(addressStr)
  return {
    navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=two_wheeler`,
    searchUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    embedUrl: `https://maps.google.com/maps?q=${encoded}&t=&z=15&ie=UTF8&iwloc=&output=embed`,
  }
}

/**
 * Initiates in-house delivery pickup:
 * Generates OTP, sets status to DISPATCHED, dispatches SMTP email to patient
 */
export async function initiatePickupAndDispatch(params: {
  orderId: string
  driverName?: string
  driverPhone?: string
  deliverySlot?: string
  request?: Request
}) {
  const { orderId, driverName, driverPhone, deliverySlot, request } = params

  // 1. Fetch order with prescription & patient details
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('pharmacy_orders')
    .select(`
      *,
      prescriptions (
        id,
        prescription_number,
        patient_id,
        prescription_items (
          medicine_name,
          strength,
          dosage_form,
          quantity
        )
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    throw new Error('Pharmacy order not found.')
  }

  // 2. Fetch patient profile to obtain email and identity
  const patientId = order.patient_id || order.prescriptions?.patient_id
  let patientEmail = ''
  let patientName = order.delivery_address_snapshot?.recipient_name || 'Valued Patient'

  let patientPhone = order.patient_phone_snapshot || ''

  if (patientId) {
    // Try to get auth user email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(patientId)
    if (authUser?.user?.email) {
      patientEmail = authUser.user.email
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email, phone_number')
      .eq('id', patientId)
      .maybeSingle()

    if (profile) {
      if (profile.email && !patientEmail) patientEmail = profile.email
      if (profile.phone_number && !patientPhone) patientPhone = profile.phone_number
      if (profile.first_name || profile.last_name) {
        patientName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      }
    }
  }

  // 3. Generate 6-digit OTP
  const otpCode = generateDeliveryOtp()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 hours window

  const currentMeta = parseDeliveryMeta(order.internal_notes)
  const effectiveDriverName = driverName || currentMeta.driver_name || '8LIV In-House Rider'
  const effectiveDriverPhone = driverPhone || currentMeta.driver_phone || order.patient_phone_snapshot || '+91 98765 43210'

  const updatedMeta: InHouseDeliveryMeta = {
    ...currentMeta,
    delivery_mode: 'IN_HOUSE',
    driver_name: effectiveDriverName,
    driver_phone: effectiveDriverPhone,
    delivery_slot: deliverySlot || currentMeta.delivery_slot || 'Within 2-4 Hours',
    delivery_otp: otpCode,
    otp_generated_at: now.toISOString(),
    otp_expires_at: expiresAt.toISOString(),
  }

  const orderRef = order.apollo_order_reference || `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`
  const addressFormatted = formatAddressForNavigation(order.delivery_address_snapshot)

  // 4. Update order to DISPATCHED
  const { error: updateErr } = await supabaseAdmin
    .from('pharmacy_orders')
    .update({
      status: 'DISPATCHED',
      courier_name: `8LIV In-House Fleet: ${effectiveDriverName}`,
      tracking_number: `Rider Ph: ${effectiveDriverPhone} • Slot: ${updatedMeta.delivery_slot}`,
      shipped_at: now.toISOString(),
      out_for_delivery_at: now.toISOString(),
      internal_notes: JSON.stringify(updatedMeta),
      updated_at: now.toISOString(),
      version: (order.version || 1) + 1,
    })
    .eq('id', orderId)

  if (updateErr) throw updateErr

  // 5. Audit Log
  await supabaseAdmin.from('pharmacy_order_status_history').insert({
    pharmacy_order_id: orderId,
    previous_status: order.status,
    new_status: 'DISPATCHED',
    notes: `In-house rider ${effectiveDriverName} picked up package for delivery. OTP dispatched to patient.`,
    actor_role: 'driver',
  })

  if (request) {
    await audit({
      pharmacyOrderId: orderId,
      actorId: 'in_house_driver',
      actorRole: 'driver',
      action: 'IN_HOUSE_DELIVERY_PICKED_UP',
      newValues: {
        status: 'DISPATCHED',
        driver_name: effectiveDriverName,
        driver_phone: effectiveDriverPhone,
        otp_generated: true,
      },
      request,
    })
  }

  // 6. Dispatch patient SMTP email with OTP
  let emailDispatched = false
  let emailError = ''

  if (patientEmail) {
    try {
      await emailService.sendDeliveryOutForDeliveryOtp({
        email: patientEmail,
        patientId,
        name: patientName,
        orderReference: orderRef,
        otpCode,
        driverName: effectiveDriverName,
        driverPhone: effectiveDriverPhone,
        deliveryAddress: addressFormatted,
      })
      emailDispatched = true
    } catch (err: any) {
      console.error('[driverDeliveryService] Failed to send OTP email via SMTP:', err.message)
      emailError = err.message
    }
  }

  // 7. Dispatch patient WhatsApp notification with OTP (non-blocking)
  if (patientPhone) {
    WhatsAppNotificationService.sendDeliveryOutForDeliveryOtp(patientPhone, {
      patientName,
      orderReference: orderRef,
      otpCode,
      driverName: effectiveDriverName,
      driverPhone: effectiveDriverPhone,
      deliverySlot: updatedMeta.delivery_slot || undefined,
    }).catch((waErr) => console.warn('[driverDeliveryService] WhatsApp notification notice:', waErr.message))
  }

  return {
    success: true,
    orderId,
    orderReference: orderRef,
    driverName: effectiveDriverName,
    driverPhone: effectiveDriverPhone,
    otpCode,
    emailDispatched,
    patientEmail: patientEmail ? patientEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    emailError: emailError || null,
    addressFormatted,
    mapUrls: buildMapUrls(addressFormatted),
  }
}

/**
 * Resend OTP to patient's email
 */
export async function resendDeliveryOtp(orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('*, prescriptions(patient_id, prescription_number)')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error('Order not found')

  const meta = parseDeliveryMeta(order.internal_notes)
  const patientId = order.patient_id || order.prescriptions?.patient_id
  let patientEmail = ''

  if (patientId) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(patientId)
    if (authUser?.user?.email) patientEmail = authUser.user.email
    if (!patientEmail) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('email').eq('id', patientId).maybeSingle()
      if (prof?.email) patientEmail = prof.email
    }
  }

  if (!patientEmail) {
    throw new Error('Patient email not found for this order.')
  }

  // Re-use current OTP if still valid and not locked out, or generate new
  let otp = meta.delivery_otp
  if (!otp || Number((meta as any).failed_attempts || 0) >= 5) {
    otp = generateDeliveryOtp()
    meta.delivery_otp = otp
    ;(meta as any).failed_attempts = 0
    meta.otp_generated_at = new Date().toISOString()
    meta.otp_expires_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('pharmacy_orders')
      .update({ internal_notes: JSON.stringify(meta) })
      .eq('id', orderId)
  }

  const orderRef = order.apollo_order_reference || `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`
  const addressFormatted = formatAddressForNavigation(order.delivery_address_snapshot)

  await emailService.sendDeliveryOutForDeliveryOtp({
    email: patientEmail,
    patientId,
    name: order.delivery_address_snapshot?.recipient_name || 'Patient',
    orderReference: orderRef,
    otpCode: otp,
    driverName: meta.driver_name || '8LIV In-House Delivery Staff',
    driverPhone: meta.driver_phone,
    deliveryAddress: addressFormatted,
  })

  return { success: true, email: patientEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') }
}

/**
 * Driver marks arrived at customer location
 */
export async function markDriverArrived(orderId: string, notes?: string) {
  const { data: order, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error('Order not found')

  const meta = parseDeliveryMeta(order.internal_notes)
  meta.driver_arrived_at = new Date().toISOString()
  if (notes) meta.notes = notes

  const { error: updateErr } = await supabaseAdmin
    .from('pharmacy_orders')
    .update({
      internal_notes: JSON.stringify(meta),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateErr) throw updateErr

  await supabaseAdmin.from('pharmacy_order_status_history').insert({
    pharmacy_order_id: orderId,
    previous_status: order.status,
    new_status: order.status,
    notes: `Driver arrived at patient delivery destination.`,
    actor_role: 'driver',
  })

  return { success: true, arrivedAt: meta.driver_arrived_at }
}

/**
 * Verifies the 6-digit OTP and confirms final delivery
 */
export async function verifyOtpAndCompleteDelivery(params: {
  orderId: string
  enteredOtp: string
  driverNotes?: string
  request?: Request
}) {
  const { orderId, enteredOtp, driverNotes, request } = params

  if (!enteredOtp || enteredOtp.trim().length !== 6) {
    throw new Error('Please enter a valid 6-digit OTP.')
  }

  const { data: order, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error('Order not found.')

  if (order.status === 'DELIVERED') {
    return { success: true, alreadyDelivered: true, message: 'This package has already been delivered.' }
  }

  if (order.status !== 'DISPATCHED' && order.status !== 'OUT_FOR_DELIVERY') {
    throw new Error('Order is not currently dispatched for delivery.')
  }

  const meta = parseDeliveryMeta(order.internal_notes)

  // Rate-limiting / brute-force protection: Max 5 failed attempts allowed
  const failedAttempts = Number((meta as any).failed_attempts || 0)
  if (failedAttempts >= 5) {
    throw new Error('Too many failed OTP attempts. Maximum 5 attempts reached. Please request a new OTP.')
  }

  // Check expiry if set
  if (meta.otp_expires_at) {
    const expiry = new Date(meta.otp_expires_at).getTime()
    if (Date.now() > expiry) {
      throw new Error('This OTP has expired. Please tap "Resend OTP" to generate a fresh code.')
    }
  }

  const storedOtp = meta.delivery_otp

  // Verify OTP
  if (!storedOtp || storedOtp.trim() !== enteredOtp.trim()) {
    const newFailed = failedAttempts + 1
    ;(meta as any).failed_attempts = newFailed
    await supabaseAdmin
      .from('pharmacy_orders')
      .update({ internal_notes: JSON.stringify(meta) })
      .eq('id', orderId)

    const remaining = Math.max(0, 5 - newFailed)
    throw new Error(`Incorrect OTP. ${remaining} attempt(s) remaining before lockout.`)
  }

  const now = new Date().toISOString()
  meta.otp_verified_at = now
  ;(meta as any).failed_attempts = 0
  meta.delivered_by = meta.driver_name || '8LIV In-House Rider'
  if (driverNotes) meta.notes = driverNotes

  const { error: updateErr } = await supabaseAdmin
    .from('pharmacy_orders')
    .update({
      status: 'DELIVERED',
      delivered_at: now,
      internal_notes: JSON.stringify(meta),
      updated_at: now,
      version: (order.version || 1) + 1,
    })
    .eq('id', orderId)

  if (updateErr) throw updateErr

  // Record milestone in status history
  await supabaseAdmin.from('pharmacy_order_status_history').insert({
    pharmacy_order_id: orderId,
    previous_status: order.status,
    new_status: 'DELIVERED',
    notes: `Verified via 6-digit OTP at patient doorstep. Delivered by ${meta.delivered_by}.`,
    actor_role: 'driver',
  })

  if (request) {
    await audit({
      pharmacyOrderId: orderId,
      actorId: 'in_house_driver',
      actorRole: 'driver',
      action: 'DELIVERY_COMPLETED_VIA_OTP',
      newValues: {
        status: 'DELIVERED',
        delivered_at: now,
        verified_by_otp: true,
      },
      request,
    })
  }

  return {
    success: true,
    deliveredAt: now,
    message: 'Package successfully delivered and verified with OTP!',
  }
}
