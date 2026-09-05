import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { hashToken, validatePasswordStrength, checkRateLimit, getClientIp } from '@/lib/authSecurity'
import { audit } from '@/lib/prescriptionService'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rate = checkRateLimit(`accept-invite:${ip}`, { limit: 10, windowMs: 60_000, lockMs: 300_000 })
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const token = String(body.token || '').trim()
    const password = String(body.password || '').trim()
    const contactName = String(body.contact_name || body.contactName || '').trim()
    const phone = body.phone ? String(body.phone).trim() : null

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required.' }, { status: 400 })
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required to set up your pharmacy account.' }, { status: 400 })
    }

    const passwordErr = validatePasswordStrength(password)
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 })
    }

    // 1. Hash incoming token and query database for valid unexpired invitation
    const tokenHash = hashToken(token)
    const now = new Date().toISOString()

    const { data: invitation, error: findError } = await supabaseAdmin
      .from('pharmacy_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (findError) throw findError
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation link.' }, { status: 400 })
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted. Please log in to your account.' },
        { status: 409 }
      )
    }

    if (invitation.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This invitation has been cancelled by an administrator.' }, { status: 403 })
    }

    if (invitation.expires_at < now) {
      return NextResponse.json({ error: 'This invitation link has expired. Please request a new invitation.' }, { status: 410 })
    }

    // 2. Atomic user provisioning via Supabase Auth Admin
    let userId: string
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const foundUser = existingUser?.users?.find(u => u.email?.toLowerCase() === invitation.email.toLowerCase())

    if (foundUser) {
      userId = foundUser.id
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { role: 'pharmacy', full_name: contactName || invitation.pharmacy_name },
      })
    } else {
      const { data: newUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { role: 'pharmacy', full_name: contactName || invitation.pharmacy_name },
      })

      if (createAuthError || !newUser?.user) {
        throw new Error(createAuthError?.message || 'Failed to create user credentials.')
      }
      userId = newUser.user.id
    }

    // 3. Ensure profile record exists safely
    try {
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          full_name: contactName || invitation.pharmacy_name,
          email: invitation.email,
          phone_number: phone || invitation.phone,
          updated_at: now,
        })
    } catch (profErr) {
      console.warn('[accept-invitation] profiles upsert non-critical:', profErr)
    }

    // 4. Create Partner Pharmacy in PENDING / INACTIVE state
    const { data: pharmacy, error: pError } = await supabaseAdmin
      .from('partner_pharmacies')
      .insert({
        tenant_id: '8liv',
        name: invitation.pharmacy_name,
        legal_entity_name: invitation.pharmacy_name,
        email: invitation.email,
        phone: phone || invitation.phone || '',
        drug_license_number: `PENDING-${randomUUID().slice(0, 8).toUpperCase()}`,
        drug_license_type: '20B/21B',
        pharmacist_name: contactName || 'Designated Pharmacist',
        pharmacist_registration_number: 'PENDING',
        verification_status: 'PENDING',
        status: 'INACTIVE',
      })
      .select('*')
      .single()

    if (pError) throw pError

    // 5. Create partner_pharmacy_users association
    await supabaseAdmin
      .from('partner_pharmacy_users')
      .upsert({
        tenant_id: '8liv',
        pharmacy_id: pharmacy.id,
        user_id: userId,
        name: contactName || invitation.pharmacy_name,
        email: invitation.email,
        role: 'PHARMACY_ADMIN',
        status: 'ACTIVE',
        updated_at: now,
      })

    // 6. Mark invitation as ACCEPTED atomically
    await supabaseAdmin
      .from('pharmacy_invitations')
      .update({
        status: 'ACCEPTED',
        accepted_at: now,
        updated_at: now,
      })
      .eq('id', invitation.id)

    // 7. Audit log
    await audit({
      actorId: userId,
      actorRole: 'pharmacy',
      action: 'PHARMACY_INVITATION_ACCEPTED',
      newValues: { invitation_id: invitation.id, pharmacy_id: pharmacy.id, pharmacy_name: pharmacy.name },
      request,
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please log in and submit your pharmacy onboarding documents.',
      pharmacy_id: pharmacy.id,
      email: invitation.email,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to accept invitation' },
      { status: err.status || 500 }
    )
  }
}
