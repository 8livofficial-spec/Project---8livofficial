import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

// GET: Fetch messages between two users
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const contactId = searchParams.get('contactId')

    if (!userId || !contactId) {
      return NextResponse.json({ error: 'Missing userId or contactId' }, { status: 400 })
    }

    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (authUser.role !== 'admin' && authUser.user.id !== userId && authUser.user.id !== contactId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message }, { status })
  }
}

// POST: Send a message (server-side, used by staff portals)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { senderId, receiverId, messageText } = body

    if (!senderId || !receiverId || !messageText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (authUser.role !== 'admin' && authUser.user.id !== senderId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: messageText,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: data })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message }, { status })
  }
}
