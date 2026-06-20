import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { EmailService } from '@/lib/emailService'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, firstName, lastName } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Create/Update Profile securely bypassing RLS (using upsert in case trigger already pre-created the profile row)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      role: 'patient',
      display_id: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError) {
      console.error('Failed to fetch user email for welcome email:', userError.message)
    } else if (userData.user?.email) {
      try {
        await EmailService.sendWelcomeEmail({
          email: userData.user.email,
          name: `${firstName || ''} ${lastName || ''}`.trim() || userData.user.email.split('@')[0],
          patientId: userId,
        })
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error("API Error in /api/register:", err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
