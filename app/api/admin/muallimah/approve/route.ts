import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const supabaseAdmin = createSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, roles')
      .eq('id', user.id)
      .single();

    if (userError || !publicUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    if (!publicUser.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Akad ID is required' }, { status: 400 });
    }

    // 1. Fetch akad to obtain user_id and batch_id
    const { data: akad, error: akadFetchError } = await supabaseAdmin
      .from('muallimah_akads')
      .select('id, user_id, batch_id')
      .eq('id', id)
      .single();

    if (akadFetchError || !akad) {
      return NextResponse.json({ error: 'Akad not found' }, { status: 404 });
    }

    // 2. Update muallimah_akads status
    const { error } = await supabaseAdmin
      .from('muallimah_akads')
      .update({
        status: 'approved',
        reviewed_by: publicUser.id,
        reviewed_at: new Date().toISOString(),
        review_notes: body.review_notes || null
      })
      .eq('id', id);

    if (error) {
      console.error('[Muallimah Approve] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to approve akad', details: error.message },
        { status: 500 }
      );
    }

    // 3. Keep muallimah_registrations in sync if exists
    if (akad.user_id && akad.batch_id) {
      await supabaseAdmin
        .from('muallimah_registrations')
        .update({
          status: 'approved',
          reviewed_by: publicUser.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('user_id', akad.user_id)
        .eq('batch_id', akad.batch_id);
    }

    // 4. Automatically add 'muallimah' role to users table
    if (akad.user_id) {
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('id, role, roles')
        .eq('id', akad.user_id)
        .single();

      if (targetUser) {
        const currentRoles = Array.isArray(targetUser.roles) ? [...targetUser.roles] : [];
        let needsUpdate = false;
        let newRole = targetUser.role;

        if (!currentRoles.includes('muallimah')) {
          currentRoles.push('muallimah');
          needsUpdate = true;
        }

        if (['thalibah', 'calon_thalibah'].includes(targetUser.role)) {
          newRole = 'muallimah';
          needsUpdate = true;
        }

        if (needsUpdate) {
          const { error: updateRoleError } = await supabaseAdmin
            .from('users')
            .update({
              role: newRole,
              roles: currentRoles
            })
            .eq('id', akad.user_id);

          if (updateRoleError) {
            console.error('[Muallimah Approve] Failed to update user roles:', updateRoleError);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Muallimah akad approved successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
