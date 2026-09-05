import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'
import { emitNotificationEvent } from '@/lib/notificationDispatcher'
import { getOrigin } from '@/lib/authSecurity'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)

    const [pharmaciesResult, invitationsResult] = await Promise.all([
      supabaseAdmin
        .from('partner_pharmacies')
        .select('*, partner_pharmacy_users(id, user_id, role, status)')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('pharmacy_invitations')
        .select('id, status, expires_at')
        .eq('status', 'INVITED')
        .gt('expires_at', new Date().toISOString()),
    ])

    let pharmacies: any[] = []
    if (pharmaciesResult.error) {
      console.warn('[admin/pharmacy] relational query failed, falling back to basic query:', pharmaciesResult.error.message)
      const basicResult = await supabaseAdmin
        .from('partner_pharmacies')
        .select('*')
        .order('created_at', { ascending: false })
      pharmacies = basicResult.data || []
    } else {
      pharmacies = pharmaciesResult.data || []
    }

    const pendingInvitations = (!invitationsResult.error && invitationsResult.data) ? invitationsResult.data.length : 0

    const stats = {
      totalPartners: pharmacies.length,
      pendingInvitations,
      underReview: pharmacies.filter((p) => p.verification_status === 'UNDER_REVIEW').length,
      verified: pharmacies.filter((p) => p.verification_status === 'VERIFIED').length,
      active: pharmacies.filter((p) => p.status === 'ACTIVE').length,
      suspended: pharmacies.filter((p) => p.status === 'SUSPENDED').length,
      rejected: pharmacies.filter((p) => p.verification_status === 'REJECTED').length,
    }

    return NextResponse.json({ pharmacies, stats })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const body = await request.json()

    const name = String(body.name || '').trim()
    const drugLicenseNumber = String(body.drug_license_number || body.drugLicenseNumber || '').trim()
    if (!name || !drugLicenseNumber) {
      return NextResponse.json(
        { error: 'Pharmacy name and drug license number are required.' },
        { status: 400 }
      )
    }

    const drugLicenseType = body.drug_license_type || body.drugLicenseType || null

    const { data: pharmacy, error } = await supabaseAdmin
      .from('partner_pharmacies')
      .insert({
        tenant_id: '8liv',
        name,
        legal_entity_name: body.legal_entity_name || body.legalEntityName || null,
        drug_license_number: drugLicenseNumber,
        drug_license_type: drugLicenseType,
        drug_license_expiry: body.drug_license_expiry || body.drugLicenseExpiry || null,
        pharmacist_name: body.pharmacist_name || body.pharmacistName || null,
        pharmacist_registration_number: body.pharmacist_registration_number || body.pharmacistRegistrationNumber || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        verification_status: 'PENDING',
        status: 'INACTIVE',
      })
      .select('*')
      .single()

    if (error) throw error

    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: 'PARTNER_PHARMACY_APPLICATION_CREATED',
      newValues: { pharmacyId: pharmacy.id, name, verification_status: 'PENDING', status: 'INACTIVE' },
      request,
    })

    return NextResponse.json({ success: true, pharmacy }, { status: 201 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const body = await request.json()

    const pharmacyId = body.id || body.pharmacyId
    if (!pharmacyId) {
      return NextResponse.json({ error: 'Pharmacy ID is required.' }, { status: 400 })
    }

    const { data: currentPharmacy, error: findError } = await supabaseAdmin
      .from('partner_pharmacies')
      .select('*')
      .eq('id', pharmacyId)
      .maybeSingle()

    if (findError) throw findError
    if (!currentPharmacy) {
      return NextResponse.json({ error: 'Partner pharmacy not found.' }, { status: 404 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    let isVerifying = false
    let isRejecting = false
    let isActivating = false
    let isSuspending = false
    let isReactivating = false

    if (body.verification_status) {
      const vs = String(body.verification_status).toUpperCase()
      if (!['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED'].includes(vs)) {
        return NextResponse.json({ error: 'Invalid verification status.' }, { status: 400 })
      }
      updates.verification_status = vs
      if (vs === 'VERIFIED') {
        updates.verified_at = new Date().toISOString()
        updates.verified_by = admin.user.id
        updates.rejection_reason = null
        isVerifying = true
      } else if (vs === 'REJECTED') {
        const rejectionReason = String(body.rejection_reason || body.reason || '').trim()
        if (!rejectionReason) {
          return NextResponse.json({ error: 'A rejection reason is required when rejecting credentials.' }, { status: 400 })
        }
        updates.rejection_reason = rejectionReason
        updates.status = 'INACTIVE'
        isRejecting = true
      }
    }

    if (body.status) {
      const s = String(body.status).toUpperCase()
      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(s)) {
        return NextResponse.json({ error: 'Invalid operational status.' }, { status: 400 })
      }

      if (s === 'ACTIVE') {
        const effectiveVerificationStatus = updates.verification_status || currentPharmacy.verification_status
        if (effectiveVerificationStatus !== 'VERIFIED') {
          return NextResponse.json(
            { error: 'Cannot activate pharmacy before credentials have been VERIFIED.' },
            { status: 400 }
          )
        }
        updates.status = 'ACTIVE'
        updates.suspension_reason = null
        if (currentPharmacy.status === 'SUSPENDED') {
          isReactivating = true
        } else {
          isActivating = true
        }
      } else if (s === 'SUSPENDED') {
        const suspensionReason = String(body.suspension_reason || body.reason || '').trim() || 'Suspended by admin'
        updates.status = 'SUSPENDED'
        updates.suspended_at = new Date().toISOString()
        updates.suspended_by = admin.user.id
        updates.suspension_reason = suspensionReason
        isSuspending = true
      } else if (s === 'INACTIVE') {
        updates.status = 'INACTIVE'
      }
    }

    if (body.drug_license_type !== undefined) {
      updates.drug_license_type = body.drug_license_type
    }
    if (body.drug_license_expiry !== undefined) {
      updates.drug_license_expiry = body.drug_license_expiry
    }
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.email !== undefined) updates.email = body.email

    const { data: updated, error } = await supabaseAdmin
      .from('partner_pharmacies')
      .update(updates)
      .eq('id', pharmacyId)
      .select('*')
      .single()

    if (error) throw error

    let auditAction = 'PARTNER_PHARMACY_STATUS_UPDATED'
    if (isVerifying) auditAction = 'PHARMACY_VERIFIED'
    else if (isRejecting) auditAction = 'PHARMACY_REJECTED'
    else if (isActivating) auditAction = 'PHARMACY_ACTIVATED'
    else if (isSuspending) auditAction = 'PHARMACY_SUSPENDED'
    else if (isReactivating) auditAction = 'PHARMACY_REACTIVATED'

    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: auditAction,
      newValues: { pharmacyId, ...updates },
      request,
    })

    if (updated.email) {
      if (isVerifying) {
        emitNotificationEvent({
          eventType: 'PHARMACY_VERIFIED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Verified',
          messageContent: `Your pharmacy credentials have been verified by 8LIV Admin. Your portal will be activated once operational clearance is complete.`,
        }).catch((err) => console.warn('Notification error on PHARMACY_VERIFIED:', err?.message))
      } else if (isRejecting) {
        emitNotificationEvent({
          eventType: 'PHARMACY_REJECTED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Verification Update',
          messageContent: `Your pharmacy verification was rejected with the following note:\n"${updated.rejection_reason}". Please contact 8LIV Admin for clarification.`,
        }).catch((err) => console.warn('Notification error on PHARMACY_REJECTED:', err?.message))
      } else if (isActivating) {
        const origin = getOrigin(request)
        emitNotificationEvent({
          eventType: 'PHARMACY_ACTIVATED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Activated — Live for Fulfillment Orders',
          messageContent: `Your partner pharmacy account is now ACTIVE and verified by 8LIV Administrators.\n\nYou may now receive, prepare, and dispatch prescription fulfillment orders.\n\nIf you have already set your password, sign in directly below. If you need to set or change your password, click the password setup link.`,
          actionUrl: `${origin}/login?role=pharmacy`,
          actionLabel: 'Sign In to Pharmacy Portal →',
          secondaryActionUrl: `${origin}/forgot-password?role=pharmacy`,
          secondaryActionLabel: 'Need to set or reset your password? Click here →',
        }).catch((err) => console.warn('Notification error on PHARMACY_ACTIVATED:', err?.message))
      } else if (isSuspending) {
        emitNotificationEvent({
          eventType: 'PHARMACY_SUSPENDED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Account Suspended',
          messageContent: `Your partner pharmacy portal has been suspended: ${updated.suspension_reason || 'Pending administrative review'}. Contact 8LIV Operations for assistance.`,
        }).catch((err) => console.warn('Notification error on PHARMACY_SUSPENDED:', err?.message))
      } else if (isReactivating) {
        emitNotificationEvent({
          eventType: 'PHARMACY_REACTIVATED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Account Reactivated',
          messageContent: `Your partner pharmacy portal has been reactivated and can resume fulfilling orders.`,
        }).catch((err) => console.warn('Notification error on PHARMACY_REACTIVATED:', err?.message))
      }
    }

    return NextResponse.json({ success: true, pharmacy: updated })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
