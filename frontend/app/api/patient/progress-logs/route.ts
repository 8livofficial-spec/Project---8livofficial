import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { invalidatePatientApiDashboardCache } from '@/app/api/patient/dashboard/route'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', logs: [] }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const all = searchParams.get('all') === 'true'
    const MAX_PAGE_LIMIT = 100
    const MAX_ALL_LIMIT = 200

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(limitParam || '50', 10) || 50))

    let query = supabaseAdmin
      .from('progress_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })

    if (all) {
      // Hard safety ceiling prevents unbounded table reads even with all=true
      query = query.range(0, MAX_ALL_LIMIT - 1)
    } else {
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    }

    const [latestLogRes, firstLogRes, paginatedRes] = await Promise.all([
      supabaseAdmin
        .from('progress_logs')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('progress_logs')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      query,
    ])

    if (paginatedRes.error) {
      console.warn('Error fetching progress logs:', paginatedRes.error.message)
      return NextResponse.json({ logs: [] })
    }

    const logs = paginatedRes.data || []
    const totalCount = paginatedRes.count ?? logs.length
    const totalPages = all ? Math.max(1, Math.ceil(totalCount / MAX_ALL_LIMIT)) : Math.max(1, Math.ceil(totalCount / limit))
    const hasMore = all ? totalCount > MAX_ALL_LIMIT : page < totalPages

    return NextResponse.json({
      logs,
      latestLog: latestLogRes.data || null,
      firstLog: firstLogRes.data || null,
      pagination: {
        page: all ? 1 : page,
        limit: all ? MAX_ALL_LIMIT : limit,
        totalCount,
        totalPages,
        hasMore,
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, logs: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const weightKg = parseFloat(body.weight_kg || body.weight)
    if (isNaN(weightKg) || weightKg <= 0) {
      return NextResponse.json({ error: 'Valid weight in kg is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('progress_logs')
      .insert({
        user_id: auth.user.id,
        weight_kg: weightKg,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    // Invalidate dashboard memory cache for instant consistency
    invalidatePatientApiDashboardCache(auth.user.id)

    // Also record patient notification
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: auth.user.id,
        type: 'progress',
        title: 'Weight Logged',
        message: `Logged daily weight of ${weightKg} kg.`,
        is_read: false,
      })

    return NextResponse.json({ success: true, log: data }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to log weight' }, { status: 500 })
  }
}
