import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId } = await params
    const role = String(auth.role || '').toLowerCase()
    const isStaff = ['support_agent', 'care_coordinator', 'admin'].includes(role)

    // 1. Fetch ticket
    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle()

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Access check: non-staff can only view their own ticket
    if (!isStaff && ticket.patient_id !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch messages in thread
    let messageQuery = supabaseAdmin
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    // Hide internal notes from patients
    if (!isStaff) {
      messageQuery = messageQuery.eq('is_internal_note', false)
    }

    const { data: messages } = await messageQuery

    // 3. Hydrate sender profiles
    const senderIds = Array.from(new Set((messages || []).map((m: any) => m.sender_id)))
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .in('id', senderIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    const enrichedMessages = (messages || []).map((m: any) => {
      const sender = profileMap.get(m.sender_id)
      return {
        id: m.id,
        senderId: m.sender_id,
        senderRole: m.sender_role,
        senderName: sender?.full_name || (m.sender_role === 'patient' ? 'Patient' : 'Care Team'),
        message: m.message_body,
        isInternalNote: m.is_internal_note,
        attachments: m.attachments || [],
        createdAt: m.created_at,
      }
    })

    return NextResponse.json({
      ticket,
      messages: enrichedMessages,
    })
  } catch (error: any) {
    console.error('[Support Ticket GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId } = await params
    const role = String(auth.role || '').toLowerCase()
    const isStaff = ['support_agent', 'care_coordinator', 'admin'].includes(role)

    const body = await request.json()
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status) updates.status = body.status
    if (isStaff) {
      if (body.priority) updates.priority = body.priority
      if (body.assignedAgentId !== undefined) updates.assigned_agent_id = body.assignedAgentId
      if (body.resolutionNotes) updates.resolution_notes = body.resolutionNotes
    }

    const { data: updated, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ticket: updated })
  } catch (error: any) {
    console.error('[Support Ticket PATCH] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

