import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  computeLocalEndOfDayUtc,
  DEFAULT_USER_TIMEZONE,
  resolveSubscriptionBounds,
} from '@/lib/subscriptionExpiry'

export type MembershipValidity = {
  active: boolean
  startedAt: string | null
  expiresAt: string | null
}

const MEMBERSHIP_EXPIRY_WARNING_DAYS = 14

/**
 * Checks whether a patient has a valid, paid pre-membership initial consultation
 * that has not yet been completed (preserving the 1st-session-before-plan flow).
 */
export async function hasPaidPreMembershipSession(patientId: string): Promise<boolean> {
  const [assessRes, txnRes, journeyRes, completedDocRes] = await Promise.all([
    supabaseAdmin
      .from('health_assessments')
      .select('consultation_fee_paid, first_consultation_completed')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('payment_transactions')
      .select('id')
      .eq('patient_id', patientId)
      .eq('payment_type', 'consultation')
      .in('status', ['success', 'paid'])
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('patient_journey_state')
      .select('first_consultation_completed')
      .eq('patient_id', patientId)
      .maybeSingle(),
    supabaseAdmin
      .from('doctor_consultations')
      .select('id, appointment_type')
      .eq('patient_id', patientId)
      .in('status', ['approved', 'rejected', 'completed'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const feePaid = Boolean(assessRes.data?.consultation_fee_paid || txnRes.data?.id)
  if (!feePaid) return false

  const completedInitial = Boolean(
    assessRes.data?.first_consultation_completed === true
    || journeyRes.data?.first_consultation_completed === true
    || (completedDocRes.data?.id && !String(completedDocRes.data.appointment_type || '').toUpperCase().includes('FOLLOW_UP'))
  )

  return !completedInitial
}

export async function getMembershipValidity(patientId: string): Promise<MembershipValidity> {
  try {
    const { data: subscription, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('starts_at, ends_at, start_date, end_date, timezone, status')
      .eq('patient_id', patientId)
      .in('status', ['ACTIVE', 'EXPIRED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subErr && subErr.code === 'PGRST204') {
      // Fallback if starts_at/ends_at migration is pending
      const { data: legacySub } = await supabaseAdmin
        .from('subscriptions')
        .select('start_date, end_date, status')
        .eq('patient_id', patientId)
        .in('status', ['ACTIVE', 'EXPIRED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (legacySub) {
        const bounds = resolveSubscriptionBounds(legacySub)
        const active = legacySub.status === 'ACTIVE' && bounds.isActive
        return {
          active,
          startedAt: bounds.startsAt?.toISOString() || legacySub.start_date,
          expiresAt: bounds.endsAt?.toISOString() || legacySub.end_date,
        }
      }
    } else if (subscription) {
      const bounds = resolveSubscriptionBounds(subscription)
      const active = subscription.status === 'ACTIVE' && bounds.isActive
      return {
        active,
        startedAt: bounds.startsAt?.toISOString() || subscription.start_date,
        expiresAt: bounds.endsAt?.toISOString() || subscription.end_date,
      }
    }
  } catch (subErr) {
    console.warn('Subscriptions table query notice in getMembershipValidity:', subErr)
  }

  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .select('created_at, metadata')
    .eq('patient_id', patientId)
    .in('payment_type', ['membership', 'combined'])
    .in('status', ['success', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Unable to verify membership validity: ${error.message}`)
  if (!data?.created_at) return { active: false, startedAt: null, expiresAt: null }

  const created = new Date(data.created_at)
  if (Number.isNaN(created.getTime())) throw new Error('Membership payment has an invalid creation date.')

  const meta = (data.metadata || {}) as Record<string, any>
  const durationMonths = Number(meta.durationMonths || meta.duration_months || 1)
  const durationDays = Number(meta.duration_days || (durationMonths > 0 ? durationMonths * 30 : 30))
  const expiry = computeLocalEndOfDayUtc(created, durationDays, DEFAULT_USER_TIMEZONE)

  return {
    active: Date.now() <= expiry.getTime(),
    startedAt: data.created_at,
    expiresAt: expiry.toISOString(),
  }
}

function formatExpiryDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export async function ensureMembershipExpiryNotification(patientId: string, validity?: MembershipValidity) {
  const membership = validity || await getMembershipValidity(patientId)
  if (!membership.active || !membership.startedAt || !membership.expiresAt) return null

  const expiresAt = new Date(membership.expiresAt)
  if (Number.isNaN(expiresAt.getTime())) return null

  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (daysRemaining < 0 || daysRemaining > MEMBERSHIP_EXPIRY_WARNING_DAYS) return null

  const notificationTitle = 'Membership ending soon'
  const notificationMessage = `Your current 8liv membership expires on ${formatExpiryDate(membership.expiresAt)}. Renew before this date to keep your care access active.`

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('patient_notifications')
    .select('*')
    .eq('patient_id', patientId)
    .eq('type', 'billing')
    .eq('title', notificationTitle)
    .gte('created_at', membership.startedAt)
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    console.error('Failed to check membership expiry notification:', lookupError.message)
    return null
  }

  if (existing) return existing

  const { data, error } = await supabaseAdmin
    .from('patient_notifications')
    .insert({
      patient_id: patientId,
      type: 'billing',
      title: notificationTitle,
      message: notificationMessage,
      is_read: false,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Failed to create membership expiry notification:', error.message)
    return null
  }

  return data
}
