import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { WhatsAppConversationService } from '@/lib/whatsapp/whatsappConversationService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const ALLOWED_STAFF_ROLES = ['admin', 'doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'staff', 'support']

/**
 * GET /api/whatsapp/conversations
 * List conversation threads or view a single thread's messages
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ALLOWED_STAFF_ROLES.includes(auth.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      const { data: conv } = await supabaseAdmin
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle()

      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      const messages = await WhatsAppConversationService.getMessages(conversationId)
      const windowCheck = WhatsAppConversationService.canSendFreeForm(conv)

      return NextResponse.json({
        conversation: conv,
        messages,
        windowCheck,
      })
    }

    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '30', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await WhatsAppConversationService.getConversations({
      status,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[WhatsAppConversationsAPI] GET error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp/conversations
 * Send staff reply to customer thread within 24-hour service window
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ALLOWED_STAFF_ROLES.includes(auth.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    const body = await request.json()
    const { conversationId, text } = body

    if (!conversationId || !text) {
      return NextResponse.json({ error: 'Missing conversationId or text' }, { status: 400 })
    }

    const replyRes = await WhatsAppConversationService.sendStaffReply({
      conversationId,
      agentId: auth.user.id,
      text,
    })

    if (!replyRes.success) {
      return NextResponse.json({ error: replyRes.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      messageId: replyRes.messageId,
    })
  } catch (err: any) {
    console.error('[WhatsAppConversationsAPI] POST error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
