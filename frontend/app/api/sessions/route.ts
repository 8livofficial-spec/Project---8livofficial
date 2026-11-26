import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  getActive90DayPackUsers,
  scheduleCoachingSession,
  scheduleCoachingSessionForAll90DayUsers,
} from '@/lib/coachingSessionService'

const ALLOWED_COACH_ROLES = new Set(['fitness_coach', 'dietitian', 'nutritionist', 'trainer', 'admin', 'doctor'])

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = String(auth.role || '').toLowerCase()
    if (!ALLOWED_COACH_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')?.trim()

    let query = supabaseAdmin
      .from('coaching_sessions')
      .select('id, user_id, coach_id, coach_role, title, scheduled_start, scheduled_end, status, created_at')
      .order('scheduled_start', { ascending: true })

    if (role !== 'admin') {
      query = query.eq('coach_id', auth.user.id)
    }
    if (patientId) {
      query = query.eq('user_id', patientId)
    }

    const [{ data, error }, active90DayPatients] = await Promise.all([
      query,
      getActive90DayPackUsers(),
    ])
    if (error) throw error

    return NextResponse.json({ sessions: data || [], active90DayPatients })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load sessions.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = String(auth.role || '').toLowerCase()
    if (!ALLOWED_COACH_ROLES.has(role)) {
      return NextResponse.json({ error: 'Only assigned coaches, dietitians, or admins can schedule sessions.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const userId = String(body.user_id || body.patientId || 'ALL_90_DAY').trim()
    const title = String(body.title || '90-Day Coaching Session').trim()
    const scheduledStart = String(body.scheduled_start || body.scheduledStart || '').trim()
    const scheduledEnd = String(body.scheduled_end || body.scheduledEnd || '').trim()
    const meetingUrl = String(body.meeting_url || body.meetingUrl || '').trim()

    if (!scheduledStart || !scheduledEnd || !meetingUrl) {
      return NextResponse.json(
        { error: 'scheduled_start, scheduled_end, and meeting_url are required.' },
        { status: 400 }
      )
    }

    if (userId === 'ALL_90_DAY') {
      const sessions = await scheduleCoachingSessionForAll90DayUsers({
        coachId: auth.user.id,
        coachRole: role,
        title,
        scheduledStart,
        scheduledEnd,
        meetingUrl,
      })
      return NextResponse.json(
        { success: true, scheduledCount: sessions.length, sessions, session: sessions[0] || null },
        { status: 201 }
      )
    }

    const session = await scheduleCoachingSession({
      coachId: auth.user.id,
      coachRole: role,
      userId,
      title,
      scheduledStart,
      scheduledEnd,
      meetingUrl,
    })

    return NextResponse.json({ success: true, scheduledCount: 1, session }, { status: 201 })
  } catch (err: any) {
    const msg = String(err?.message || 'Unable to schedule coaching session.')
    if (msg.startsWith('EXCEEDS_PLAN_END_DATE') || msg.startsWith('INVALID_') || msg.startsWith('NO_ACTIVE_90_DAY_MEMBERS')) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    if (msg.startsWith('PLAN_EXPIRED') || msg.startsWith('NO_ACTIVE_PLAN')) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
