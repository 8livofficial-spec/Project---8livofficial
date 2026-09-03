/**
 * Safe logging helper for patient journey & auth debugging.
 * 
 * - Debug logs are suppressed in production environments (NODE_ENV === 'production').
 * - Patient UUIDs and sensitive identifiers are masked/sanitized to prevent PII/PHI leakage.
 */

export function sanitizeJourneyData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (key === 'patientId' || key === 'userId' || key === 'id') {
      const strVal = String(value || '')
      sanitized[key] = strVal ? `${strVal.slice(0, 4)}...${strVal.slice(-4)}` : '***'
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

export function logJourneyDebug(tag: string, data: Record<string, unknown>): void {
  // Gate debug logging: suppressed completely in production unless explicitly enabled via flag
  const isProduction = process.env.NODE_ENV === 'production'
  const forceDebug = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true'

  if (isProduction && !forceDebug) {
    return
  }

  const safeData = sanitizeJourneyData(data)
  console.info(tag, safeData)
}
