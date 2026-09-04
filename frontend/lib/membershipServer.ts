import { supabaseAdmin } from '@/lib/supabaseServer'

export type MembershipValidity = {
  active: boolean
  startedAt: string | null
  expiresAt: string | null
}

const MEMBERSHIP_EXPIRY_WARNING_DAYS = 7

function addOneCalendarMonth(value: string) {
  const start = new Date(value)
  if (Number.isNaN(start.getTime())) return null

  const expiry = new Date(start)
  const originalDay = expiry.getUTCDate()
  expiry.setUTCDate(1)
  expiry.setUTCMonth(expiry.getUTCMonth() + 1)
  const lastDayOfTargetMonth = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0)).getUTCDate()
  expiry.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth))
  return expiry
}

export async function getMembershipValidity(patientId: string): Promise<MembershipValidity> {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('start_date, end_date, status')
      .eq('patient_id', patientId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscription) {
      const endTimestamp = new Date(subscription.end_date).getTime()
      const isActive = Date.now() <= (endTimestamp + 24 * 60 * 60 * 1000)
      return {
        active: isActive,
        startedAt: subscription.start_date,
        expiresAt: subscription.end_date,
      }
    }
  } catch (subErr) {
    console.warn('Subscriptions table query notice in getMembershipValidity:', subErr)
  }

  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .select('created_at')
    .eq('patient_id', patientId)
    .in('payment_type', ['membership', 'combined'])
    .in('status', ['success', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Unable to verify membership validity: ${error.message}`)
  if (!data?.created_at) return { active: false, startedAt: null, expiresAt: null }

  const expiry = addOneCalendarMonth(data.created_at)
  if (!expiry) throw new Error('Membership payment has an invalid creation date.')

  return {
    active: Date.now() < expiry.getTime(),
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
