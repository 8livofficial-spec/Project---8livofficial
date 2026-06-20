import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

async function authenticatedAdmin(request: Request) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  if (!data.user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  return profile?.role === 'admin' ? data.user : null
}

export async function POST(request: Request) {
  try {
    const admin = await authenticatedAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admin authorization required.' }, { status: 403 })
    const body = await request.json()
    const providerId = String(body.providerId || '')
    const amount = Number(body.amount)
    const reason = String(body.reason || '').trim()
    if (!providerId || !Number.isFinite(amount) || amount === 0 || !reason) return NextResponse.json({ error: 'providerId, non-zero amount, and reason are required.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.rpc('adjust_provider_wallet', {
      p_provider_id: providerId,
      p_amount: amount,
      p_reason: reason,
      p_admin_id: admin.id,
      p_reference_id: String(body.referenceId || `adjustment:${randomUUID()}`),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 409 })
    return NextResponse.json({ adjustment: data })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to adjust wallet.' }, { status: 500 })
  }
}
