import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)

    const { searchParams } = new URL(request.url)
    const coachFilter = (searchParams.get('coachId') || '').trim()
    const roleFilter = (searchParams.get('role') || '').trim()

    let query = supabaseAdmin
      .from('coaching_sessions')
      .select('id, user_id, coach_id, coach_role, title, scheduled_start, scheduled_end, status, joined_at, created_at')
      .order('scheduled_start', { ascending: false })
      .limit(1000)

    if (coachFilter) query = query.eq('coach_id', coachFilter)
    if (roleFilter) query = query.eq('coach_role', roleFilter)

    const { data: rows, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sessionsList = rows || []
    const userIds = Array.from(
      new Set(
        sessionsList
          .flatMap((r: any) => [r.coach_id, r.user_id])
          .filter(Boolean)
      )
    )

    let profileMap = new Map<string, any>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, phone_number, role')
        .in('id', userIds)
      profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    }

    const formatName = (id: string, fallback: string) => {
      const p = profileMap.get(id)
      if (!p) return fallback
      return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || fallback
    }

    // Group individual patient rows by scheduled session event (coach_id + title + scheduled_start + scheduled_end)
    const groupedSessions = new Map<
      string,
      {
        sessionKey: string
        title: string
        coachId: string
        coachName: string
        coachEmail: string | null
        coachRole: string
        scheduledStart: string
        scheduledEnd: string
        status: string
        invitedCount: number
        joinedCount: number
        pendingCount: number
        attendees: Array<{
          sessionId: string
          patientId: string
          patientName: string
          patientEmail: string | null
          patientPhone: string | null
          joinedAt: string | null
          status: string
        }>
      }
    >()

    const providerStats = new Map<
      string,
      {
        coachId: string
        coachName: string
        coachEmail: string | null
        coachRole: string
        sessionKeys: Set<string>
        totalInvited: number
        totalJoined: number
      }
    >()

    for (const row of sessionsList) {
      const key = `${row.coach_id}::${row.title}::${row.scheduled_start}::${row.scheduled_end}`
      const coachProf = profileMap.get(row.coach_id)
      const patientProf = profileMap.get(row.user_id)
      const coachName = formatName(row.coach_id, 'Coaching Provider')
      const patientName = formatName(row.user_id, '90-Day Member')
      const joined = Boolean(row.joined_at)

      if (!groupedSessions.has(key)) {
        groupedSessions.set(key, {
          sessionKey: key,
          title: row.title,
          coachId: row.coach_id,
          coachName,
          coachEmail: coachProf?.email || null,
          coachRole: row.coach_role || 'fitness_coach',
          scheduledStart: row.scheduled_start,
          scheduledEnd: row.scheduled_end,
          status: row.status,
          invitedCount: 0,
          joinedCount: 0,
          pendingCount: 0,
          attendees: [],
        })
      }

      const group = groupedSessions.get(key)!
      group.invitedCount += 1
      if (joined) group.joinedCount += 1
      group.pendingCount = group.invitedCount - group.joinedCount
      group.attendees.push({
        sessionId: row.id,
        patientId: row.user_id,
        patientName,
        patientEmail: patientProf?.email || null,
        patientPhone: patientProf?.phone_number || null,
        joinedAt: row.joined_at || null,
        status: row.status,
      })

      if (!providerStats.has(row.coach_id)) {
        providerStats.set(row.coach_id, {
          coachId: row.coach_id,
          coachName,
          coachEmail: coachProf?.email || null,
          coachRole: row.coach_role || 'fitness_coach',
          sessionKeys: new Set<string>(),
          totalInvited: 0,
          totalJoined: 0,
        })
      }
      const pStat = providerStats.get(row.coach_id)!
      pStat.sessionKeys.add(key)
      pStat.totalInvited += 1
      if (joined) pStat.totalJoined += 1
    }

    const sessions = Array.from(groupedSessions.values())
    const providerSummaries = Array.from(providerStats.values())
      .map((p) => ({
        coachId: p.coachId,
        coachName: p.coachName,
        coachEmail: p.coachEmail,
        coachRole: p.coachRole,
        totalSessions: p.sessionKeys.size,
        totalInvited: p.totalInvited,
        totalJoined: p.totalJoined,
      }))
      .sort((a, b) => b.totalJoined - a.totalJoined)

    const totals = {
      totalSessions: sessions.length,
      totalInvited: sessions.reduce((acc, s) => acc + s.invitedCount, 0),
      totalJoined: sessions.reduce((acc, s) => acc + s.joinedCount, 0),
    }

    return NextResponse.json({
      success: true,
      totals,
      providerSummaries,
      sessions,
    })
  } catch (err: any) {
    const status = err?.status || (err?.message === 'Unauthorized' ? 401 : err?.message === 'Forbidden' ? 403 : 500)
    return NextResponse.json({ error: err?.message || 'Failed to load coaching attendance.' }, { status })
  }
}
