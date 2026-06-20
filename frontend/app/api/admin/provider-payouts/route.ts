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

export async function PATCH(request: Request) {
  try {
    const { adminId, transactionId, payoutStatus } = await request.json()
    if (!adminId || !transactionId || !payoutStatus) {
      return NextResponse.json({ error: 'adminId, transactionId, and payoutStatus are required.' }, { status: 400 })
    }

    if (!(await verifyAdmin(adminId))) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('doctor_wallet_transactions')
      .update({
        payout_status: payoutStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update payout.' }, { status: 500 })
  }
}
