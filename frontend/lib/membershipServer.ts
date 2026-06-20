import { supabaseAdmin } from '@/lib/supabaseServer'

export type MembershipValidity = {
  active: boolean
  startedAt: string | null
  expiresAt: string | null
}

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
