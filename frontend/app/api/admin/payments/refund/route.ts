import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

async function verifyAdmin(adminId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle()

  if (error) throw error
  return data?.role === 'admin'
}

export async function POST(request: Request) {
  try {
    const { adminId, paymentId, reason } = await request.json()
    if (!adminId || !paymentId) {
      return NextResponse.json({ error: 'adminId and paymentId are required.' }, { status: 400 })
    }

    if (!(await verifyAdmin(adminId))) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'refund_requested',
        metadata: { refund_reason: reason || 'Admin requested refund' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to request refund.' }, { status: 500 })
  }
}
