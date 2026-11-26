export const DEFAULT_USER_TIMEZONE = 'Asia/Kolkata'
export const RENEWAL_WINDOW_DAYS = 14

/**
 * Returns the YYYY-MM-DD calendar date in the given IANA timezone.
 */
export function formatDateInTimeZone(date: Date, timeZone: string = DEFAULT_USER_TIMEZONE): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const d = parts.find((p) => p.type === 'day')?.value
    if (y && m && d) return `${y}-${m}-${d}`
  } catch {
    // Fallback to IST (+05:30) if invalid timezone is passed
  }
  const istMs = date.getTime() + 330 * 60 * 1000
  return new Date(istMs).toISOString().split('T')[0]
}

/**
 * Computes the timezone offset in minutes (e.g. +330 for Asia/Kolkata) at a given UTC Date.
 */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string = DEFAULT_USER_TIMEZONE): number {
  try {
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr = date.toLocaleString('en-US', { timeZone })
    const diffMs = new Date(tzStr).getTime() - new Date(utcStr).getTime()
    return Math.round(diffMs / 60000)
  } catch {
    return 330 // Asia/Kolkata fallback
  }
}

/**
 * Given a base Date and a number of days to add, computes the exact UTC Date
 * corresponding to 23:59:59.999 in the user's local timezone on that target day.
 */
export function computeLocalEndOfDayUtc(
  baseDate: Date,
  addDays: number,
  timeZone: string = DEFAULT_USER_TIMEZONE
): Date {
  const baseLocalDate = formatDateInTimeZone(baseDate, timeZone)
  const [y, m, d] = baseLocalDate.split('-').map(Number)
  const targetUtcMidnight = new Date(Date.UTC(y, m - 1, d + addDays, 23, 59, 59, 999))
  const offsetMinutes = getTimeZoneOffsetMinutes(targetUtcMidnight, timeZone)
  return new Date(targetUtcMidnight.getTime() - offsetMinutes * 60 * 1000)
}

/**
 * Resolves the authoritative UTC start and end timestamps for a subscription row.
 * Prefers `starts_at` / `ends_at` (TIMESTAMPTZ); falls back to `start_date` / `end_date`
 * interpreted in the user's timezone (`00:00:00` to `23:59:59`).
 */
export function resolveSubscriptionBounds(subscription: {
  starts_at?: string | null
  ends_at?: string | null
  start_date?: string | null
  end_date?: string | null
  timezone?: string | null
}): { startsAt: Date | null; endsAt: Date | null; isActive: boolean; daysRemaining: number } {
  const tz = subscription.timezone || DEFAULT_USER_TIMEZONE

  let startsAt: Date | null = null
  if (subscription.starts_at) {
    const parsed = new Date(subscription.starts_at)
    if (!Number.isNaN(parsed.getTime())) startsAt = parsed
  } else if (subscription.start_date) {
    const [y, m, d] = String(subscription.start_date).slice(0, 10).split('-').map(Number)
    if (y && m && d) {
      const approx = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
      const offsetMin = getTimeZoneOffsetMinutes(approx, tz)
      startsAt = new Date(approx.getTime() - offsetMin * 60 * 1000)
    }
  }

  let endsAt: Date | null = null
  if (subscription.ends_at) {
    const parsed = new Date(subscription.ends_at)
    if (!Number.isNaN(parsed.getTime())) endsAt = parsed
  } else if (subscription.end_date) {
    const [y, m, d] = String(subscription.end_date).slice(0, 10).split('-').map(Number)
    if (y && m && d) {
      const approx = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
      const offsetMin = getTimeZoneOffsetMinutes(approx, tz)
      endsAt = new Date(approx.getTime() - offsetMin * 60 * 1000)
    }
  }

  if (!endsAt) {
    return { startsAt, endsAt: null, isActive: false, daysRemaining: 0 }
  }

  const nowMs = Date.now()
  const isActive = nowMs <= endsAt.getTime()
  const daysRemaining = isActive ? Math.max(0, Math.ceil((endsAt.getTime() - nowMs) / 86400000)) : 0

  return { startsAt, endsAt, isActive, daysRemaining }
}
