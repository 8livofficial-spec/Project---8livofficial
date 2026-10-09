/**
 * Two-Way WhatsApp Customer Support Service
 *
 * Implements clinical and customer support messaging with:
 * - 24-hour Meta Customer Service Window enforcement
 * - Conversation thread retrieval with role-based access
 * - Customer association and opt-out preference tracking
 * - Extensible design for future AI triage/chatbot agents
 */

import { supabaseAdmin } from '../supabaseServer'
import { WhatsAppClient } from './whatsappClient'
import { normalizePhoneNumber } from '../phone'

export interface WhatsAppConversation {
  id: string
  phone_number: string
  user_id?: string | null
  customer_name?: string | null
  last_customer_message_at?: string | null
  last_agent_message_at?: string | null
  is_opted_out: boolean
  opted_out_at?: string | null
  assigned_agent_id?: string | null
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'
  created_at: string
  updated_at: string
}

export interface WhatsAppMessageRecord {
  id: string
  meta_message_id?: string | null
  user_id?: string | null
  recipient_phone: string
  direction: 'OUTBOUND' | 'INBOUND'
  message_type: string
  template_name?: string | null
  content?: string | null
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  error_code?: string | null
  error_message?: string | null
  created_at: string
}

export class WhatsAppConversationService {
  /**
   * Evaluates if a free-form message can be sent within Meta's 24-hour customer service window.
   */
  public static canSendFreeForm(conversation: WhatsAppConversation): {
    allowed: boolean
    reason?: string
    windowRemainingMs?: number
  } {
    if (conversation.is_opted_out) {
      return {
        allowed: false,
        reason: 'Customer has opted out of WhatsApp communications (STOP received).',
      }
    }

    if (!conversation.last_customer_message_at) {
      return {
        allowed: false,
        reason: 'Customer has not sent an inbound message yet. A Meta-approved WhatsApp template is required to initiate conversation.',
      }
    }

    const lastMsgTime = new Date(conversation.last_customer_message_at).getTime()
    const now = Date.now()
    const windowMs = 24 * 60 * 60 * 1000 // 24 hours
    const elapsed = now - lastMsgTime

    if (elapsed > windowMs) {
      return {
        allowed: false,
        reason: 'Customer service 24-hour window has expired. A Meta-approved WhatsApp template must be used to re-engage.',
      }
    }

    return {
      allowed: true,
      windowRemainingMs: windowMs - elapsed,
    }
  }

  /**
   * Retrieves conversation threads with optional status filtering.
   */
  public static async getConversations(options?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ conversations: WhatsAppConversation[]; total: number }> {
    const limit = options?.limit || 30
    const offset = options?.offset || 0

    let query = supabaseAdmin
      .from('whatsapp_conversations')
      .select('*', { count: 'exact' })
      .order('last_customer_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    const { data, count, error } = await query
    if (error) {
      console.error('[WhatsAppConversation] Error fetching conversations:', error)
      return { conversations: [], total: 0 }
    }

    return {
      conversations: (data as WhatsAppConversation[]) || [],
      total: count || 0,
    }
  }

  /**
   * Retrieves full chronological message history for a conversation.
   */
  public static async getMessages(conversationId: string): Promise<WhatsAppMessageRecord[]> {
    const { data: conv } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('phone_number')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conv?.phone_number) return []

    const normalized = normalizePhoneNumber(conv.phone_number)
    const phoneCandidates = [conv.phone_number, normalized.e164, normalized.whatsapp].filter(Boolean)

    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .in('recipient_phone', phoneCandidates)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[WhatsAppConversation] Error fetching messages:', error)
      return []
    }

    return (data as WhatsAppMessageRecord[]) || []
  }

  /**
   * Staff agent sends a reply within the 24-hour customer service window.
   */
  public static async sendStaffReply(params: {
    conversationId: string
    agentId: string
    text: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { conversationId, agentId, text } = params

    if (!text || !text.trim()) {
      return { success: false, error: 'Reply message cannot be empty' }
    }

    const { data: conv } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conv) {
      return { success: false, error: 'Conversation not found' }
    }

    const windowCheck = this.canSendFreeForm(conv as WhatsAppConversation)
    if (!windowCheck.allowed) {
      return {
        success: false,
        error: windowCheck.reason || 'Cannot send free-form message outside 24h window.',
      }
    }

    const normalized = normalizePhoneNumber(conv.phone_number)
    if (!normalized.whatsapp) {
      return { success: false, error: 'Invalid recipient phone number format' }
    }

    // Dispatch via WhatsApp Cloud API
    const metaRes = await WhatsAppClient.sendText({
      to: normalized.whatsapp,
      text: text.trim(),
    })

    if (!metaRes.success) {
      return { success: false, error: metaRes.error?.message || 'Failed to dispatch via Meta API' }
    }

    const wamid = metaRes.messageId

    // Record outbound staff message
    await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        meta_message_id: wamid,
        user_id: conv.user_id || null,
        recipient_phone: conv.phone_number,
        direction: 'OUTBOUND',
        message_type: 'text',
        content: text.trim(),
        status: 'SENT',
        metadata: {
          conversation_id: conversationId,
          sent_by_agent_id: agentId,
        },
      })

    // Update conversation metadata
    await supabaseAdmin
      .from('whatsapp_conversations')
      .update({
        last_agent_message_at: new Date().toISOString(),
        assigned_agent_id: agentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return { success: true, messageId: wamid }
  }

  /**
   * Updates customer opt-out state
   */
  public static async setOptOut(phone: string, optOut: boolean): Promise<boolean> {
    const normalized = normalizePhoneNumber(phone)
    const e164 = normalized.e164 || phone

    const { error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .update({
        is_opted_out: optOut,
        opted_out_at: optOut ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('phone_number', e164)

    return !error
  }
}
