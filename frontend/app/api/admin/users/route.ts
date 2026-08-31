import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { EmailService } from '@/lib/emailService'
import { createToken, getOrigin } from '@/lib/authSecurity'
import { assertAdmin } from '@/lib/apiSecurity'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, role, phone_number, email')
      .in('role', ['admin', 'doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer'])
      .order('role', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data || [] })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const body = await request.json()
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      phoneNumber,
      accountNumber,
      ifsc,
      bankName,
      beneficiaryName,
      upiId
    } = body

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 2. Register user using service role client to bypass email confirmation blocks
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        display_id: `${firstName} ${lastName}`.trim(),
        role: role
      }
    })

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 })
    }

    const newUserId = authData.user.id

    // 3. Upsert profiles table
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUserId,
        email,
        first_name: firstName || '',
        last_name: lastName || '',
        phone_number: phoneNumber || '',
        role: role
      })

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // 4. Save bank / UPI payout account if provided
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Provider'
    const accountHolder = beneficiaryName?.trim() || (role === 'doctor' ? `Dr. ${fullName}` : fullName)
    const cleanAccountNumber = accountNumber?.trim() || null
    const cleanIfsc = ifsc?.trim().toUpperCase() || null
    const cleanUpiId = upiId?.trim() || null
    const cleanBankName = bankName?.trim() || ''

    if (role === 'doctor') {
      const { error: docErr } = await supabaseAdmin
        .from('doctor_profiles')
        .upsert({
          id: newUserId,
          full_name: `Dr. ${fullName}`
        })

      if (docErr) {
        console.error('Failed to create doctor profile:', docErr.message)
      }

      const { error: walletErr } = await supabaseAdmin
        .from('doctor_wallet')
        .upsert({
          doctor_id: newUserId,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0
        })

      if (walletErr) {
        console.error('Failed to create doctor wallet:', walletErr.message)
      }

      // Upsert doctor_payout_accounts if bank or UPI is provided
      if (cleanAccountNumber || cleanUpiId) {
        const accountType = cleanUpiId && !cleanAccountNumber ? 'vpa' : 'bank_account'
        await supabaseAdmin
          .from('doctor_payout_accounts')
          .upsert({
            doctor_id: newUserId,
            account_type: accountType,
            beneficiary_name: accountHolder,
            account_number: cleanAccountNumber,
            ifsc: cleanIfsc,
            vpa: cleanUpiId,
            updated_at: new Date().toISOString()
          }, { onConflict: 'doctor_id' })
      }
    }

    // Also upsert provider_profiles for provider ecosystem compatibility
    try {
      await supabaseAdmin.from('provider_profiles').upsert({
        provider_id: newUserId,
        role: role === 'trainer' ? 'fitness_coach' : role,
        full_name: role === 'doctor' ? `Dr. ${fullName}` : fullName,
        email,
        phone_number: phoneNumber || '',
        consultation_type: 'video',
        payout_amount: role === 'doctor' ? 300 : 0,
        status: 'active',
        upi_id: cleanUpiId || '',
        bank_account_details: cleanAccountNumber ? {
          account_number: cleanAccountNumber,
          ifsc: cleanIfsc,
          bank_name: cleanBankName,
          beneficiary_name: accountHolder
        } : {},
        updated_at: new Date().toISOString()
      })
    } catch (pErr) {
      console.warn('Optional provider_profiles sync skipped:', pErr)
    }

    try {
      const { token, tokenHash } = createToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(newUserId, {
        user_metadata: {
          role: role.toUpperCase(),
          display_id: `${firstName || ''} ${lastName || ''}`.trim() || email,
          verification_token_hash: tokenHash,
          verification_expires_at: expiresAt,
          verification_purpose: 'PROVIDER_INVITATION',
        }
      })

      if (updateError) throw updateError

      await EmailService.sendProviderInvitation({
        email,
        name: `${firstName || ''} ${lastName || ''}`.trim() || email,
        patientId: newUserId,
        role,
        link: `${getOrigin(request)}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
        expiresIn: '7 days',
      })
    } catch (emailError) {
      console.error('Failed to send staff invitation:', emailError)
    }

    // 5. Log notifications of user registration
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: admin.id,
        type: 'security',
        title: 'Staff Registered',
        message: `Registered ${firstName} ${lastName} as a ${role}.`,
        is_read: false
      })

    return NextResponse.json({ success: true, userId: newUserId })

  } catch (err: any) {
    console.error('API Error in /api/admin/users:', err)
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Prevent deleting oneself
    if (admin.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove your own admin account.' }, { status: 400 })
    }

    // 2. Manual sequential database cleanup to prevent foreign key errors
    // a. Update care team assignments to set references to NULL
    await supabaseAdmin
      .from('care_team_assignments')
      .update({ doctor_id: null })
      .eq('doctor_id', targetUserId)

    await supabaseAdmin
      .from('care_team_assignments')
      .update({ dietitian_id: null })
      .eq('dietitian_id', targetUserId)

    await supabaseAdmin
      .from('care_team_assignments')
      .update({ trainer_id: null })
      .eq('trainer_id', targetUserId)

    // b. Delete clinician availability slots
    await supabaseAdmin
      .from('provider_availability')
      .delete()
      .eq('provider_id', targetUserId)

    // c. Set doctor consultations doctor_id to NULL to preserve patient booking records
    await supabaseAdmin
      .from('doctor_consultations')
      .update({ doctor_id: null })
      .eq('doctor_id', targetUserId)

    // d. Delete wallet transactions
    await supabaseAdmin
      .from('doctor_wallet_transactions')
      .delete()
      .eq('doctor_id', targetUserId)

    await supabaseAdmin
      .from('doctor_payout_accounts')
      .delete()
      .eq('doctor_id', targetUserId)

    // e. Delete wallet
    await supabaseAdmin
      .from('doctor_wallet')
      .delete()
      .eq('doctor_id', targetUserId)

    // f. Delete doctor profile
    await supabaseAdmin
      .from('doctor_profiles')
      .delete()
      .eq('id', targetUserId)

    // g. Delete base profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetUserId)

    // 3. Delete user account from Supabase Auth
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    if (authDeleteErr) {
      return NextResponse.json({ error: `Auth deletion failed: ${authDeleteErr.message}` }, { status: 500 })
    }

    // 4. Log audit trail notification
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: admin.id,
        type: 'security',
        title: 'Staff Member Removed',
        message: `Successfully removed staff member with ID ${targetUserId}.`,
        is_read: false
      })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('API Error in DELETE /api/admin/users:', err)
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}
