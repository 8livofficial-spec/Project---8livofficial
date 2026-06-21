import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthenticatedUser } from '@/lib/apiSecurity';

export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    const isAdminAction = authUser.role === 'admin';
    const targetUserId = isAdminAction ? (userId || authUser.user.id) : authUser.user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let finalProfile = profile;

    if (!finalProfile) {
      // Auto-heal profiles if user exists in auth metadata but missing in database profiles
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
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
              id: targetUserId,
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
