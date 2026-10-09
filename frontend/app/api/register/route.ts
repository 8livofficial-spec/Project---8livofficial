import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { EmailService } from '@/lib/emailService'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { userId, firstName, lastName } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // 2. Authorization: Caller can only update their own profile unless admin
    if (auth.user.id !== userId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Preserve existing role if user already has an elevated role
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    const assignedRole = existingProfile?.role || 'patient'

    // Create/Update Profile securely
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      role: assignedRole,
      display_id: `${firstName || ''} ${lastName || ''}`.trim() || undefined,
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Background welcome email dispatch - never delay registration response
    supabaseAdmin.auth.admin.getUserById(userId).then(({ data: userData, error: userError }) => {
      if (userError) {
        console.error('Failed to fetch user email for welcome email:', userError.message)
      } else if (userData?.user?.email) {
        EmailService.sendWelcomeEmail({
          email: userData.user.email,
          name: `${firstName || ''} ${lastName || ''}`.trim() || userData.user.email.split('@')[0],
          patientId: userId,
        }).catch((emailError) => {
          console.error('Failed to send welcome email:', emailError)
        })
      }
    }).catch((err) => {
      console.error('Background welcome email lookup failed:', err)
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error("API Error in /api/register:", err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
