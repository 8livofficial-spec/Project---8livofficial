import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { email, otpCode, newPassword } = await req.json();

    if (!email || !otpCode || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Verify OTP
    const { data: otps, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otpCode)
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError || !otps || otps.length === 0) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    const otpRecord = otps[0];
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // 2. Find User in Supabase Auth to get their ID
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to verify user.' }, { status: 500 });
    }

    const targetUser = usersData.users.find(u => u.email === email);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // 3. Update Password using Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 4. Delete the used OTP (and any older ones for this email to clean up)
    await supabase.from('password_reset_otps').delete().eq('email', email);

    return NextResponse.json({ message: 'Password updated successfully!' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
