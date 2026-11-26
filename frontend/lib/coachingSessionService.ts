import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getMembershipValidity, hasPaidPreMembershipSession } from '@/lib/membershipServer'

export const JOIN_WINDOW_BEFORE_MS = 10 * 60 * 1000 // 10 minutes before scheduled_start
export const JOIN_TOKEN_TTL_MS = 2 * 60 * 1000 // 2 minutes single-use token

export type CoachingSessionPublicDto = {
  id: string
  user_id: string
  coach_id: string
  coach_role: string
  title: string
  scheduled_start: string
  scheduled_end: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  can_join: boolean
  join_window_opens_at: string
  mid_session_grace: boolean
}

function getSigningSecret(): string {
  return (
    process.env.COACHING_JOIN_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '8liv-coaching-join-secret-fallback'
  )
}

export function isWithinJoinWindow(
  scheduledStartIso: string,
  scheduledEndIso: string,
  nowMs: number = Date.now()
): boolean {
  const startMs = new Date(scheduledStartIso).getTime()
  const endMs = new Date(scheduledEndIso).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false
  return nowMs >= startMs - JOIN_WINDOW_BEFORE_MS && nowMs <= endMs
}

export function signJoinToken(payload: { jti: string; sessionId: string; userId: string; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifySignedJoinToken(
  token: string
): { jti: string; sessionId: string; userId: string; exp: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [encoded, providedSig] = parts
    const expectedSig = createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url')
    const a = Buffer.from(providedSig, 'utf8')
    const b = Buffer.from(expectedSig, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!parsed?.jti || !parsed?.sessionId || !parsed?.userId || !parsed?.exp) return null
    if (Date.now() > Number(parsed.exp)) return null
    return parsed
  } catch {
    return null
  }
}

export async function scheduleCoachingSession(params: {
  coachId: string
  coachRole: string
  userId: string
  title: string
  scheduledStart: string
  scheduledEnd: string
  meetingUrl: string
}) {
  const start = new Date(params.scheduledStart)
  const end = new Date(params.scheduledEnd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error('INVALID_TIME_WINDOW: scheduled_end must be after scheduled_start.')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(params.meetingUrl)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('Invalid protocol')
    }
  } catch {
    throw new Error('INVALID_MEETING_URL: Please provide a valid Google Meet or Zoom URL.')
  }

  const [membershipValidity, paidPreMembership] = await Promise.all([
    getMembershipValidity(params.userId),
    hasPaidPreMembershipSession(params.userId),
  ])

  if (!membershipValidity.active && !paidPreMembership) {
    throw new Error(
      membershipValidity.expiresAt
        ? 'PLAN_EXPIRED: Cannot schedule session for an expired plan.'
        : 'NO_ACTIVE_PLAN: Patient must have an active plan or paid initial session.'
    )
  }

  if (membershipValidity.active && membershipValidity.expiresAt) {
    const planEndsAtMs = new Date(membershipValidity.expiresAt).getTime()
    if (Number.isFinite(planEndsAtMs) && start.getTime() > planEndsAtMs) {
      throw new Error(
        `EXCEEDS_PLAN_END_DATE: Session start (${start.toISOString()}) exceeds patient's plan end date (${membershipValidity.expiresAt}).`
      )
    }
  }

  const normalizedRole =
    params.coachRole === 'trainer'
      ? 'fitness_coach'
      : params.coachRole === 'nutritionist'
        ? 'dietitian'
        : params.coachRole

  const { data: created, error } = await supabaseAdmin
    .from('coaching_sessions')
    .insert({
      user_id: params.userId,
      coach_id: params.coachId,
      coach_role: ['fitness_coach', 'dietitian', 'nutritionist', 'trainer'].includes(normalizedRole)
        ? normalizedRole
        : 'fitness_coach',
      title: params.title.trim(),
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      meeting_url: parsedUrl.toString(),
      status: 'SCHEDULED',
    })
    .select('id, user_id, coach_id, coach_role, title, scheduled_start, scheduled_end, status, created_at')
    .single()

  if (error) throw error

  // Notify the 90-day patient in-app about the newly scheduled session
  const roleLabel = normalizedRole === 'dietitian' ? 'Dietitian' : 'Fitness Coach'
  const localTimeStr = start.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  try {
    await supabaseAdmin.from('patient_notifications').insert({
      patient_id: params.userId,
      type: 'appointment',
      title: `New ${roleLabel} Session Scheduled`,
      message: `Your ${roleLabel} scheduled "${params.title.trim()}" for ${localTimeStr} IST. You can join from your dashboard 10 minutes before start.`,
      is_read: false,
    })
  } catch (notifErr) {
    console.warn('[coachingSessionService] Non-blocking notification insert error:', notifErr)
  }

  return created
}

export async function listUserCoachingSessions(userId: string): Promise<{
  sessions: CoachingSessionPublicDto[]
  planStatus: 'ACTIVE' | 'EXPIRED' | 'PRE_MEMBERSHIP' | 'NONE'
  expiresAt: string | null
}> {
  const [membershipValidity, paidPreMembership, sessionsRes] = await Promise.all([
    getMembershipValidity(userId),
    hasPaidPreMembershipSession(userId),
    // Explicitly omit meeting_url so it never leaves the database
    supabaseAdmin
      .from('coaching_sessions')
      .select('id, user_id, coach_id, coach_role, title, scheduled_start, scheduled_end, status, joined_at')
      .eq('user_id', userId)
      .order('scheduled_start', { ascending: true }),
  ])

  if (sessionsRes.error) throw sessionsRes.error

  const planStatus = membershipValidity.active
    ? 'ACTIVE'
    : paidPreMembership
      ? 'PRE_MEMBERSHIP'
      : membershipValidity.expiresAt
        ? 'EXPIRED'
        : 'NONE'

  const nowMs = Date.now()
  const sessions: CoachingSessionPublicDto[] = (sessionsRes.data || []).map((row: any) => {
    const startMs = new Date(row.scheduled_start).getTime()
    const endMs = new Date(row.scheduled_end).getTime()
    const inWindow = isWithinJoinWindow(row.scheduled_start, row.scheduled_end, nowMs)
    const midSessionGrace = Boolean(
      row.joined_at &&
      Number.isFinite(endMs) &&
      nowMs <= endMs &&
      new Date(row.joined_at).getTime() <= endMs
    )
    const hasAccess = membershipValidity.active || paidPreMembership || midSessionGrace
    const canJoin = row.status === 'SCHEDULED' && hasAccess && inWindow

    return {
      id: row.id,
      user_id: row.user_id,
      coach_id: row.coach_id,
      coach_role: row.coach_role,
      title: row.title,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      status: row.status,
      can_join: canJoin,
      join_window_opens_at: new Date(startMs - JOIN_WINDOW_BEFORE_MS).toISOString(),
      mid_session_grace: midSessionGrace,
    }
  })

  return {
    sessions,
    planStatus,
    expiresAt: membershipValidity.expiresAt,
  }
}

export async function authorizeSessionJoin(
  sessionId: string,
  userId: string,
  nowMs: number = Date.now()
): Promise<
  | { ok: true; session: any; isMidSessionGrace: boolean }
  | { ok: false; code: string; message: string; status: number }
> {
  const { data: session, error } = await supabaseAdmin
    .from('coaching_sessions')
    .select('id, user_id, coach_id, title, scheduled_start, scheduled_end, meeting_url, status, joined_at')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) throw error
  if (!session) {
    return { ok: false, code: 'SESSION_NOT_FOUND', message: 'Coaching session not found.', status: 404 }
  }
  if (session.user_id !== userId) {
    return { ok: false, code: 'FORBIDDEN_USER', message: 'This session does not belong to your account.', status: 403 }
  }
  if (session.status !== 'SCHEDULED') {
    return { ok: false, code: 'SESSION_INACTIVE', message: `Session is ${session.status.toLowerCase()}.`, status: 403 }
  }

  if (!isWithinJoinWindow(session.scheduled_start, session.scheduled_end, nowMs)) {
    return {
      ok: false,
      code: 'OUTSIDE_JOIN_WINDOW',
      message: 'Join window is only open from 10 minutes before start until the scheduled end time.',
      status: 403,
    }
  }

  const endMs = new Date(session.scheduled_end).getTime()
  const isMidSessionGrace = Boolean(session.joined_at && nowMs <= endMs)

  const [membershipValidity, paidPreMembership] = await Promise.all([
    getMembershipValidity(userId),
    hasPaidPreMembershipSession(userId),
  ])

  if (!membershipValidity.active && !paidPreMembership && !isMidSessionGrace) {
    return {
      ok: false,
      code: membershipValidity.expiresAt ? 'PLAN_EXPIRED' : 'NO_ACTIVE_PLAN',
      message: membershipValidity.expiresAt
        ? 'Your 90-day coaching plan has expired. Please upgrade or continue with the same pack to join.'
        : 'An active plan or paid initial session is required to join.',
      status: 403,
    }
  }

  return { ok: true, session, isMidSessionGrace }
}

export async function createSingleUseJoinToken(sessionId: string, userId: string) {
  const authResult = await authorizeSessionJoin(sessionId, userId)
  if (!authResult.ok) return authResult

  const jti = randomUUID()
  const expMs = Date.now() + JOIN_TOKEN_TTL_MS

  const { error } = await supabaseAdmin.from('coaching_session_join_tokens').insert({
    jti,
    session_id: sessionId,
    user_id: userId,
    expires_at: new Date(expMs).toISOString(),
  })
  if (error) throw error

  const token = signJoinToken({ jti, sessionId, userId, exp: expMs })
  return { ok: true as const, token, expiresAt: new Date(expMs).toISOString() }
}

export async function redeemSessionJoin(sessionId: string, userId: string, token?: string | null) {
  const nowIso = new Date().toISOString()

  if (token) {
    const verified = verifySignedJoinToken(token)
    if (!verified || verified.sessionId !== sessionId || verified.userId !== userId) {
      return { ok: false as const, code: 'INVALID_TOKEN', message: 'Invalid or expired join token.', status: 403 }
    }

    const { data: updatedToken, error: tokenErr } = await supabaseAdmin
      .from('coaching_session_join_tokens')
      .update({ used_at: nowIso })
      .eq('jti', verified.jti)
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .is('used_at', null)
      .select('jti')
      .maybeSingle()

    if (tokenErr) throw tokenErr
    if (!updatedToken) {
      return {
        ok: false as const,
        code: 'TOKEN_ALREADY_USED',
        message: 'This single-use join link has already been used.',
        status: 403,
      }
    }
  }

  const authResult = await authorizeSessionJoin(sessionId, userId)
  if (!authResult.ok) return authResult

  if (!authResult.session.joined_at) {
    await supabaseAdmin
      .from('coaching_sessions')
      .update({ joined_at: nowIso, updated_at: nowIso })
      .eq('id', sessionId)
  }

  return {
    ok: true as const,
    meetingUrl: authResult.session.meeting_url as string,
  }
}
