import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'
import { emitNotificationEvent } from '@/lib/notificationDispatcher'
import { getOrigin } from '@/lib/authSecurity'

type RouteContext = { params: Promise<{ pharmacyId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    await assertAdmin(request)
    const { pharmacyId } = await context.params

    if (!pharmacyId) {
      return NextResponse.json({ error: 'Pharmacy ID is required.' }, { status: 400 })
    }

    // 1. Fetch Partner Pharmacy
    const { data: pharmacy, error: pError } = await supabaseAdmin
      .from('partner_pharmacies')
      .select('*')
      .eq('id', pharmacyId)
      .maybeSingle()

    if (pError) throw pError
    if (!pharmacy) {
      return NextResponse.json({ error: 'Partner pharmacy not found.' }, { status: 404 })
    }

    // 2. Fetch Associated Pharmacy Users
    const { data: users } = await supabaseAdmin
      .from('partner_pharmacy_users')
      .select('id, user_id, name, email, role, status, created_at')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })

    // 3. Fetch Invitations History
    let invitations: any[] = []
    if (pharmacy.email) {
      const { data: invs } = await supabaseAdmin
        .from('pharmacy_invitations')
        .select('id, pharmacy_name, email, phone, status, expires_at, accepted_at, created_at')
        .eq('email', pharmacy.email.toLowerCase().trim())
        .order('created_at', { ascending: false })
      invitations = invs || []
    }

    // 4. Fulfillment Orders Statistics
    const { data: allOrders } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('id, status, created_at, tracking_number, courier_partner, prescription_id')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })

    const orders = allOrders || []
    const totalOrders = orders.length
    const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length
    const activeOrders = orders.filter((o) => !['DELIVERED', 'CANCELLED', 'UNABLE_TO_FULFILL'].includes(o.status)).length
    const recentOrders = orders.slice(0, 10)

    // 5. Audit Log History for this pharmacy
    let auditLogs: any[] = []
    try {
      const { data: rawLogs, error: logError } = await supabaseAdmin
        .from('fulfilment_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!logError && rawLogs) {
        auditLogs = rawLogs.filter((log: any) => {
          const nv = log.new_values || {}
          return (
            nv.pharmacyId === pharmacyId ||
            nv.pharmacy_id === pharmacyId ||
            nv.id === pharmacyId ||
            (log.details && JSON.stringify(log.details).includes(pharmacyId))
          )
        }).slice(0, 20)
      }
    } catch (e: any) {
      console.warn('[pharmacyDetail] audit log fetch warning:', e?.message)
    }

    return NextResponse.json({
      pharmacy,
      users: users || [],
      invitations,
      stats: {
        totalOrders,
        activeOrders,
        completedOrders,
      },
      recentOrders,
      auditLogs,
    })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await assertAdmin(request)
    const { pharmacyId } = await context.params

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

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    let isVerifying = false
    let isRejecting = false
    let isActivating = false
    let isSuspending = false
    let isReactivating = false

    // Verification status updates
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

    // Operational status updates
    if (body.status) {
      const s = String(body.status).toUpperCase()
      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(s)) {
        return NextResponse.json({ error: 'Invalid operational status.' }, { status: 400 })
      }

      if (s === 'ACTIVE') {
        // Must be VERIFIED before activation
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
        const suspensionReason = String(body.suspension_reason || body.reason || '').trim() || 'Suspended by administrator'
        updates.status = 'SUSPENDED'
        updates.suspended_at = new Date().toISOString()
        updates.suspended_by = admin.user.id
        updates.suspension_reason = suspensionReason
        isSuspending = true
      } else if (s === 'INACTIVE') {
        updates.status = 'INACTIVE'
      }
    }

    // Profile metadata updates if provided
    if (body.drug_license_type !== undefined) updates.drug_license_type = body.drug_license_type
    if (body.drug_license_expiry !== undefined) updates.drug_license_expiry = body.drug_license_expiry
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.email !== undefined) updates.email = body.email

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('partner_pharmacies')
      .update(updates)
      .eq('id', pharmacyId)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Determine audit action
    let auditAction = 'PARTNER_PHARMACY_UPDATED'
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

    // Dispatch notifications safely
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
        }).catch((err) => console.warn('[detail] Notification error on PHARMACY_VERIFIED:', err?.message))
      } else if (isRejecting) {
        emitNotificationEvent({
          eventType: 'PHARMACY_REJECTED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Verification Update',
          messageContent: `Your pharmacy verification was rejected with the following note:\n"${updated.rejection_reason}". Please contact 8LIV Admin for clarification.`,
        }).catch((err) => console.warn('[detail] Notification error on PHARMACY_REJECTED:', err?.message))
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
        }).catch((err) => console.warn('[detail] Notification error on PHARMACY_ACTIVATED:', err?.message))
      } else if (isSuspending) {
        emitNotificationEvent({
          eventType: 'PHARMACY_SUSPENDED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Account Suspended',
          messageContent: `Your partner pharmacy portal has been suspended: ${updated.suspension_reason || 'Pending administrative review'}. Contact 8LIV Operations for assistance.`,
        }).catch((err) => console.warn('[detail] Notification error on PHARMACY_SUSPENDED:', err?.message))
      } else if (isReactivating) {
        emitNotificationEvent({
          eventType: 'PHARMACY_REACTIVATED',
          entityType: 'partner_pharmacy',
          entityId: updated.id,
          recipientEmail: updated.email,
          recipientRole: 'pharmacy',
          subject: '8LIV Partner Pharmacy Account Reactivated',
          messageContent: `Your partner pharmacy portal has been reactivated and can resume fulfilling orders.`,
        }).catch((err) => console.warn('[detail] Notification error on PHARMACY_REACTIVATED:', err?.message))
      }
    }

    return NextResponse.json({ success: true, pharmacy: updated })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
