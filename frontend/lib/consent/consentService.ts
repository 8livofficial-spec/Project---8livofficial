import { supabaseAdmin } from '@/lib/supabaseServer'
import { CONSENT_VERSION, PART4_DATA_NOTICE, PART3_TREATMENT_CONSENT, TERMS_OF_SERVICE } from './constants'

export type GateType = 'gate1' | 'gate2' | 'gate3'
export type ConsentAction = 'accepted' | 'withdrawn'

export interface RecordConsentInput {
  userId: string
  guardianUserId?: string | null
  documentId: string
  version?: string
  gate: GateType
  choices: Record<string, any>
  action?: ConsentAction
  ipAddress?: string | null
  userAgent?: string | null
  otpVerified?: boolean
  bookingId?: string | null
}

export async function recordConsent(input: RecordConsentInput) {
  const version = input.version || CONSENT_VERSION
  const action = input.action || 'accepted'

  const { data, error } = await supabaseAdmin
    .from('consent_records')
    .insert({
      user_id: input.userId,
      guardian_user_id: input.guardianUserId || null,
      document_id: input.documentId,
      version: version,
      gate: input.gate,
      choices: input.choices,
      action: action,
      timestamp: new Date().toISOString(),
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
      otp_verified: Boolean(input.otpVerified),
      booking_id: input.bookingId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to write append-only consent record:', error)
    throw new Error(`Consent record failure: ${error.message}`)
  }

  return data
}

export async function getUserConsentStatus(userId: string, bookingId?: string | null) {
  // Fetch the latest consent record per document_id and gate
  const { data: records, error } = await supabaseAdmin
    .from('consent_records')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching user consent status:', error)
    return {
      gate1Accepted: false,
      gate2Accepted: false,
      gate3Accepted: false,
      records: [],
    }
  }

  const allRecords = records || []

  // Gate 1 check: Most recent gate1 record for data_notice v4.0 is accepted
  const latestGate1 = allRecords.find(r => r.gate === 'gate1' && r.document_id === 'data_notice' && r.version === CONSENT_VERSION)
  const gate1Accepted = latestGate1?.action === 'accepted' && 
    Boolean(latestGate1.choices?.consent_health_data) && 
    Boolean(latestGate1.choices?.consent_care_team_share)

  // Gate 2 check: Most recent gate2 record for terms v4.0 is accepted
  const latestGate2 = allRecords.find(r => r.gate === 'gate2' && r.version === CONSENT_VERSION)
  const gate2Accepted = latestGate2?.action === 'accepted' && Boolean(latestGate2.choices?.terms_agreed)

  // Gate 3 check: For a specific bookingId or active consultation
  let gate3Accepted = false
  if (bookingId) {
    const latestGate3 = allRecords.find(r => r.gate === 'gate3' && r.booking_id === bookingId && r.version === CONSENT_VERSION)
    gate3Accepted = latestGate3?.action === 'accepted' && Boolean(latestGate3.otp_verified)
  } else {
    const latestGate3 = allRecords.find(r => r.gate === 'gate3' && r.version === CONSENT_VERSION)
    gate3Accepted = latestGate3?.action === 'accepted' && Boolean(latestGate3.otp_verified)
  }

  return {
    gate1Accepted: Boolean(gate1Accepted),
    gate2Accepted: Boolean(gate2Accepted),
    gate3Accepted: Boolean(gate3Accepted),
    latestGate1,
    latestGate2,
    records: allRecords,
  }
}
