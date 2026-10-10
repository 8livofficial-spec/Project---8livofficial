/**
 * In-memory serverless isolate cache for patient dashboard data.
 * Isolated per-patient with TTL and explicit invalidation.
 */

const patientApiDashboardCache = new Map<string, { data: any; expiresAt: number }>()

export function getCachedPatientDashboard(patientId: string): any | null {
  const cached = patientApiDashboardCache.get(patientId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }
  return null
}

export function setCachedPatientDashboard(patientId: string, data: any, ttlMs = 15000): void {
  patientApiDashboardCache.set(patientId, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

export function invalidatePatientApiDashboardCache(patientId?: string): void {
  if (patientId) {
    patientApiDashboardCache.delete(patientId)
  } else {
    patientApiDashboardCache.clear()
  }
}
