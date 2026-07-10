import { NextResponse } from 'next/server'
import { assertPharmacyAccess } from '@/lib/pharmacy'

export async function GET(request: Request) {
  try {
    const auth = await assertPharmacyAccess(request)
    return NextResponse.json({
      role: auth.role,
      pharmacyId: auth.pharmacyId,
      user: {
        id: auth.user.id,
        email: auth.user.email || null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
