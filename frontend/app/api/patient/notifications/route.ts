import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatientOrAssignedProvider } from '@/lib/apiSecurity'
import { ensureMembershipExpiryNotification } from '@/lib/membershipServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

    await assertPatientOrAssignedProvider(request, patientId)
    await ensureMembershipExpiryNotification(patientId)

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10) || 20))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabaseAdmin
      .from('patient_notifications')
      .select('*', { count: 'exact' })
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const [paginatedRes, unreadCountRes] = await Promise.all([
      query,
      supabaseAdmin
        .from('patient_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .eq('is_read', false),
    ])

    if (paginatedRes.error) {
      return NextResponse.json({ error: paginatedRes.error.message }, { status: 500 })
    }

    const notifications = paginatedRes.data || []
    const totalCount = paginatedRes.count ?? notifications.length
    const totalPages = Math.max(1, Math.ceil(totalCount / limit))
    const hasMore = page < totalPages

    return NextResponse.json({
      notifications,
      unreadCount: unreadCountRes.count ?? 0,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      }
    })
  } catch (err: unknown) {
    console.error('API Error in GET /api/patient/notifications:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { patientId, notificationId, markAll } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

    await assertPatientOrAssignedProvider(request, patientId)

    if (markAll) {
      // Mark all notifications for this patient as read
      const { error } = await supabaseAdmin
        .from('patient_notifications')
        .update({ is_read: true })
        .eq('patient_id', patientId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (notificationId) {
      // Mark specific notification as read
      const { error } = await supabaseAdmin
        .from('patient_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('patient_id', patientId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Missing notificationId or markAll flag' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    console.error('API Error in /api/patient/notifications:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
