import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const role = String(auth.role || '').toLowerCase()
    const isStaff = ['support_agent', 'care_coordinator', 'admin', 'customer_care', 'support'].includes(role)

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        id,
        ticket_number,
        patient_id,
        assigned_agent_id,
        category,
        priority,
        status,
        subject,
        description,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    // Patients can only see their own tickets
    if (!isStaff) {
      query = query.eq('patient_id', auth.user.id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: tickets, error } = await query

    if (error) {
      // Table might not exist yet if migration hasn't run on hosted Supabase
      console.warn('[Support Tickets GET] DB query warning:', error.message)
      return NextResponse.json({ tickets: [] })
    }

    // If staff, hydrate with patient names & contacts
    if (isStaff && tickets && tickets.length > 0) {
      const patientIds = Array.from(new Set(tickets.map((t: any) => t.patient_id)))
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', patientIds)

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

      const enriched = tickets.map((t: any) => ({
        ...t,
        patient: profileMap.get(t.patient_id) || {
          fullName: 'Patient',
          email: '',
          phone: '',
        },
      }))

      return NextResponse.json({ tickets: enriched })
    }

    return NextResponse.json({ tickets: tickets || [] })
  } catch (error: any) {
    console.error('[Support Tickets GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const role = String(auth.role || '').toLowerCase()
    const isStaff = ['support_agent', 'care_coordinator', 'admin', 'customer_care', 'support'].includes(role)

    const patientId = isStaff ? (body.patientId || auth.user.id) : auth.user.id
    const { category, subject, description, priority } = body

    if (!category || !subject || !description) {
      return NextResponse.json({ error: 'Category, subject, and description are required.' }, { status: 400 })
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        patient_id: patientId,
        assigned_agent_id: isStaff ? auth.user.id : null,
        category,
        priority: priority || 'medium',
        status: 'open',
        subject: subject.trim(),
        description: description.trim(),
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Support Tickets POST] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create initial message in thread
    if (ticket?.id) {
      await supabaseAdmin.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: auth.user.id,
        sender_role: role || 'patient',
        message_body: description.trim(),
        is_internal_note: false,
      })
    }

    return NextResponse.json({ success: true, ticket })
  } catch (error: any) {
    console.error('[Support Tickets POST] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

