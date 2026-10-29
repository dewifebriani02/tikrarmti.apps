import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/rbac';

const supabaseAdmin = createSupabaseAdmin();

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const payload = await request.json();
    const { registration_id, target_juz, reset_status } = payload;

    if (!registration_id || !target_juz) {
      return NextResponse.json({ success: false, error: 'registration_id and target_juz are required' }, { status: 400 });
    }

    const updateData: any = {
      chosen_juz: target_juz
    };

    if (reset_status) {
      updateData.exam_status = 'not_started';
    }

    const { data, error } = await supabaseAdmin
      .from('pendaftaran_tikrar_tahfidz')
      .update(updateData)
      .eq('id', registration_id)
      .select()
      .single();

    if (error) {
      console.error('Error resetting exam status:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in exam reset POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
