import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let finalProfile = profile;

    if (!finalProfile) {
      // Auto-heal profiles if user exists in auth metadata but missing in database profiles
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!authErr && authData?.user) {
        const user = authData.user;
        const role = user.user_metadata?.role || (user.email === '8livofficial@gmail.com' ? 'admin' : null);

        if (role) {
          const name = user.user_metadata?.display_id || 'Clinician';
          const first_name = name.split(' ')[0] || 'Clinician';
          const last_name = name.split(' ').slice(1).join(' ') || '';

          const { data: newProfile, error: insertErr } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: userId,
              role: role,
              first_name: first_name,
              last_name: last_name,
            })
            .select()
            .maybeSingle();

          if (!insertErr && newProfile) {
            finalProfile = newProfile;
          }
        }
      }
    }

    return NextResponse.json({ profile: finalProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
