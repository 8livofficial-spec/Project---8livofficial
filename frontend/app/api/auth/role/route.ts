import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      userId: auth.user.id,
      email: auth.user.email,
      role: auth.role || 'patient',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve role' }, { status: 500 })
  }
}
