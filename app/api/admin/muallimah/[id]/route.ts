import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const supabaseAdmin = createSupabaseAdmin();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: requestingUser } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!requestingUser?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('muallimah_registrations')
      .select(`
        *,
        user:users!muallimah_registrations_user_id_fkey(full_name, email),
        batch:batches(*)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching muallimah registration:', error);
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: requestingUser } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!requestingUser?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get the public.user record for foreign key reference
    const { data: publicUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userError || !publicUser) {
      return NextResponse.json({ error: 'User not found in public.users table' }, { status: 400 });
    }

    const body = await request.json();

    // Remove updated_at from body if it exists (table doesn't have this column)
    const { updated_at, ...updateData } = body;

    const { error } = await supabaseAdmin
      .from('muallimah_registrations')
      .update({
        ...updateData,
        reviewed_by: publicUser.id
      })
      .eq('id', params.id);

    if (error) {
      console.error('Error updating muallimah registration:', error);
      return NextResponse.json(
        { error: 'Failed to update registration', details: error.message },
        { status: 500 }
      );
    }

    // If approving, automatically add 'muallimah' role to users table
    if (updateData.status === 'approved') {
      const { data: regData } = await supabaseAdmin
        .from('muallimah_registrations')
        .select('user_id')
        .eq('id', params.id)
        .single();

      if (regData?.user_id) {
        const { data: targetUser } = await supabaseAdmin
          .from('users')
          .select('id, role, roles')
          .eq('id', regData.user_id)
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
            const { error: roleUpdateError } = await supabaseAdmin
              .from('users')
              .update({
                role: newRole,
                roles: currentRoles
              })
              .eq('id', regData.user_id);

            if (roleUpdateError) {
              console.error('[Muallimah PATCH] Failed to update user roles:', roleUpdateError);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Muallimah registration updated successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: requestingUser } = await supabaseAdmin
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single();

    if (!requestingUser?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('muallimah_registrations')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting muallimah registration:', error);
      return NextResponse.json(
        { error: 'Failed to delete registration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Muallimah registration deleted successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
