import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(
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
    const isStaff = ['support_agent', 'care_coordinator', 'admin', 'customer_care', 'support'].includes(role)

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, patient_id, status')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (!isStaff && ticket.patient_id !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const message = String(body.message || '').trim()
    const isInternalNote = isStaff ? Boolean(body.isInternalNote) : false
    const attachments = Array.isArray(body.attachments) ? body.attachments : []

    if (!message) {
      return NextResponse.json({ error: 'Message text cannot be empty' }, { status: 400 })
    }

    // Insert message
    const { data: insertedMessage, error: msgError } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: auth.user.id,
        sender_role: role || 'patient',
        message_body: message,
        is_internal_note: isInternalNote,
        attachments,
      })
      .select()
      .maybeSingle()

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Update ticket updated_at and status:
    // If agent replies (and not an internal note), change status to 'waiting_on_patient'
    // If patient replies, change status to 'in_progress'
    const newStatus = isStaff
      ? (isInternalNote ? ticket.status : 'waiting_on_patient')
      : 'in_progress'

    await supabaseAdmin
      .from('support_tickets')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)

    // Notify the patient if it was a public staff reply
    if (isStaff && !isInternalNote) {
      try {
        await supabaseAdmin.from('patient_notifications').insert({
          patient_id: ticket.patient_id,
          type: 'support_reply',
          title: 'Care Team Reply',
          message: `Customer Care replied to your ticket: "${message.slice(0, 60)}${message.length > 60 ? '...' : ''}"`,
          is_read: false,
        })
      } catch (notifErr) {
        console.warn('[Support Ticket Message] Notification warning:', notifErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: insertedMessage,
    })
  } catch (error: any) {
    console.error('[Support Ticket Message POST] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

