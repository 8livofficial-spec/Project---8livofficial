import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // 1. Check if user exists in our profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      // Return a success message even if the email doesn't exist to prevent email enumeration attacks
      return NextResponse.json({ message: 'If an account exists, a verification code has been sent.' });
    }

    // 2. Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 minutes

    // 3. Save OTP in database
    const { error: insertError } = await supabase
      .from('password_reset_otps')
      .insert([
        {
          email: profile.email,
          otp_code: otpCode,
          expires_at: expiresAt
        }
      ]);

    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return NextResponse.json({ error: 'Failed to generate verification code.' }, { status: 500 });
    }

    // 4. Send email via Resend
    const { data, error: resendError } = await resend.emails.send({
      from: '8Liv Medical Team <onboarding@resend.dev>', // You should verify a custom domain in Resend for production
      to: [profile.email],
      subject: 'Password Reset Verification Code - 8Liv',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a; text-align: center;">8Liv Password Reset</h2>
          <p style="color: #475569; font-size: 16px;">Hello ${profile.full_name || 'there'},</p>
          <p style="color: #475569; font-size: 16px;">We received a request to reset your password. Use the verification code below to proceed. This code is valid for 10 minutes.</p>
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d46e53;">${otpCode}</span>
          </div>
          <p style="color: #475569; font-size: 14px; text-align: center;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
      `,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'If an account exists, a verification code has been sent.' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
