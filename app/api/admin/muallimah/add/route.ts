import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const supabaseAdmin = createSupabaseAdmin();

// Validation schema for adding existing user as muallimah
const addMuallimahSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  batch_id: z.string().uuid('Invalid batch ID format'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  birth_place: z.string().min(2, 'Birth place is required'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  whatsapp: z.string().regex(/^62\d{8,14}$/, 'WhatsApp must start with 62 followed by 8-14 digits'),
  email: z.string().email('Invalid email format'),
  education: z.string().min(2, 'Education is required'),
  occupation: z.string().min(2, 'Occupation is required'),
  memorization_level: z.string().min(2, 'Memorization level is required'),
  memorized_juz: z.string().optional(),
  preferred_juz: z.string().min(1, 'Preferred juz is required'),
  teaching_experience: z.string().min(5, 'Teaching experience is required'),
  teaching_years: z.string().optional(),
  teaching_institutions: z.string().optional(),
  preferred_schedule: z.string().min(1, 'Preferred schedule is required'),
  backup_schedule: z.string().min(1, 'Backup schedule is required'),
  tajweed_institution: z.string().optional(),
  quran_institution: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, roles')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || !adminUser.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = addMuallimahSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify user exists
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, roles')
      .eq('id', data.user_id)
      .single();

    if (userCheckError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify batch exists
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, name, status')
      .eq('id', data.batch_id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Check if user is already registered as muallimah for this batch
    const { data: existingRegistration } = await supabaseAdmin
      .from('muallimah_registrations')
      .select('id, status')
      .eq('user_id', data.user_id)
      .eq('batch_id', data.batch_id)
      .maybeSingle();

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'User is already registered as muallimah for this batch', existingStatus: existingRegistration.status },
        { status: 409 }
      );
    }

    // Insert muallimah registration
    console.log('[Add Muallimah] Adding existing user as muallimah:', {
      userId: data.user_id,
      batchId: data.batch_id,
      adminId: adminUser.id
    });

    const { error: insertError } = await supabaseAdmin
      .from('muallimah_registrations')
      .insert({
        user_id: data.user_id,
        batch_id: data.batch_id,
        full_name: data.full_name,
        birth_date: data.birth_date,
        birth_place: data.birth_place,
        address: data.address,
        whatsapp: data.whatsapp,
        email: data.email,
        education: data.education,
        occupation: data.occupation,
        memorization_level: data.memorization_level,
        memorized_juz: data.memorized_juz || null,
        preferred_juz: data.preferred_juz,
        teaching_experience: data.teaching_experience,
        teaching_years: data.teaching_years || null,
        teaching_institutions: data.teaching_institutions || null,
        preferred_schedule: data.preferred_schedule,
        backup_schedule: data.backup_schedule,
        tajweed_institution: data.tajweed_institution || null,
        quran_institution: data.quran_institution || null,
        status: 'approved', // Auto-approve since admin is adding
        reviewed_by: adminUser.id,
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Add Muallimah] Database error:', insertError);
      return NextResponse.json(
        { error: 'Failed to add muallimah', details: insertError.message, code: insertError.code },
        { status: 500 }
      );
    }

    // Update user roles to include 'muallimah' and update primary role if applicable
    const currentRoles = Array.isArray(existingUser.roles) ? [...existingUser.roles] : [];
    let needsUpdate = false;
    let newRole = existingUser.role;

    if (!currentRoles.includes('muallimah')) {
      currentRoles.push('muallimah');
      needsUpdate = true;
    }

    if (['thalibah', 'calon_thalibah', 'ustadzah'].includes(existingUser.role)) {
      newRole = 'muallimah';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await supabaseAdmin
        .from('users')
        .update({
          role: newRole,
          roles: currentRoles
        })
        .eq('id', data.user_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Muallimah added successfully',
      data: {
        user: existingUser,
        batch: batch
      }
    });

  } catch (error) {
    console.error('[Add Muallimah] Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
