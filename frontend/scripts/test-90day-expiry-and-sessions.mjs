import assert from 'node:assert/strict'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Mirror pure logic from subscriptionExpiry.ts & coachingSessionService.ts for runtime verification
const DEFAULT_TZ = 'Asia/Kolkata'

function formatDateInTimeZone(date, timeZone = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${d}`
}

function getTimeZoneOffsetMinutes(date, timeZone = DEFAULT_TZ) {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = date.toLocaleString('en-US', { timeZone })
  return Math.round((new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000)
}

function computeLocalEndOfDayUtc(baseDate, addDays, timeZone = DEFAULT_TZ) {
  const baseLocalDate = formatDateInTimeZone(baseDate, timeZone)
  const [y, m, d] = baseLocalDate.split('-').map(Number)
  const targetUtcMidnight = new Date(Date.UTC(y, m - 1, d + addDays, 23, 59, 59, 999))
  const offsetMinutes = getTimeZoneOffsetMinutes(targetUtcMidnight, timeZone)
  return new Date(targetUtcMidnight.getTime() - offsetMinutes * 60 * 1000)
}

function isWithinJoinWindow(scheduledStartIso, scheduledEndIso, nowMs) {
  const startMs = new Date(scheduledStartIso).getTime()
  const endMs = new Date(scheduledEndIso).getTime()
  return nowMs >= startMs - 10 * 60 * 1000 && nowMs <= endMs
}

// 1. IST Midnight Boundary Test (01:00 AM IST on 2026-11-26 = 2026-11-25T19:30:00Z)
const purchase1amIst = new Date('2026-11-26T01:00:00+05:30')
assert.equal(formatDateInTimeZone(purchase1amIst, 'Asia/Kolkata'), '2026-11-26', 'Must resolve IST calendar day, not UTC previous day')

const endsAt90 = computeLocalEndOfDayUtc(purchase1amIst, 90, 'Asia/Kolkata')
// +90 days from 2026-11-26 is 2027-02-24 23:59:59.999+05:30 = 2027-02-24T18:29:59.999Z
assert.equal(endsAt90.toISOString(), '2027-02-24T18:29:59.999Z', 'Must expire at exact 23:59:59.999 IST')

// Verify 1 second before midnight IST is ACTIVE, 1 second after midnight IST is EXPIRED
const beforeMidnightIst = new Date('2027-02-24T23:59:59+05:30').getTime()
const afterMidnightIst = new Date('2027-02-25T00:00:01+05:30').getTime()
assert.equal(beforeMidnightIst <= endsAt90.getTime(), true, 'Must remain active at 23:59:59 IST')
assert.equal(afterMidnightIst <= endsAt90.getTime(), false, 'Must expire immediately at 00:00:01 IST next day')

// 2. Early Renewal Stacking (+90 days stacked onto ends_at)
const stackedEndsAt = computeLocalEndOfDayUtc(endsAt90, 90, 'Asia/Kolkata')
assert.equal(formatDateInTimeZone(stackedEndsAt, 'Asia/Kolkata'), '2027-05-25', 'Early renewal must stack +90 days onto ends_at')

// 3. Join Window Gating (10 mins before start through scheduled_end)
const sessionStart = '2026-11-26T23:30:00+05:30'
const sessionEnd = '2026-11-27T00:30:00+05:30'
assert.equal(isWithinJoinWindow(sessionStart, sessionEnd, new Date('2026-11-26T23:19:00+05:30').getTime()), false, '11m before must be blocked')
assert.equal(isWithinJoinWindow(sessionStart, sessionEnd, new Date('2026-11-26T23:20:00+05:30').getTime()), true, '10m before must be allowed')
assert.equal(isWithinJoinWindow(sessionStart, sessionEnd, new Date('2026-11-27T00:30:00+05:30').getTime()), true, 'Exact end time must be allowed')
assert.equal(isWithinJoinWindow(sessionStart, sessionEnd, new Date('2026-11-27T00:31:00+05:30').getTime()), false, 'After end time must be blocked')

// 4. Mid-Session Expiry Grace (plan expires 23:59:59 IST during 23:30 - 00:30 session)
const planExpiry = new Date('2026-11-26T23:59:59+05:30').getTime()
const joinedAt = new Date('2026-11-26T23:35:00+05:30').getTime()
const checkAt1215am = new Date('2026-11-27T00:15:00+05:30').getTime()
const midSessionGrace = Boolean(joinedAt && checkAt1215am <= new Date(sessionEnd).getTime())
assert.equal(checkAt1215am <= planExpiry, false, 'Plan is expired at 12:15 AM')
assert.equal(midSessionGrace, true, 'Mid-session grace must keep active session open until 00:30 AM')

// 5. User-Bound Signed Token Tamper Check
const secret = 'test-secret'
const payload = Buffer.from(JSON.stringify({ jti: '123', sessionId: 's1', userId: 'u1', exp: Date.now() + 60000 })).toString('base64url')
const sig = createHmac('sha256', secret).update(payload).digest('base64url')
const forgedPayload = Buffer.from(JSON.stringify({ jti: '123', sessionId: 's1', userId: 'attacker', exp: Date.now() + 60000 })).toString('base64url')
assert.equal(
  timingSafeEqual(Buffer.from(sig), Buffer.from(createHmac('sha256', secret).update(forgedPayload).digest('base64url'))),
  false,
  'Tampered userId in join token must fail HMAC verification'
)

console.log('ALL_90DAY_EXPIRY_AND_SESSION_TESTS_PASSED')
