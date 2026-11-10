import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { generateFlyerAIPrompt } from '@/lib/flyer-prompt';

const supabaseAdmin = createSupabaseAdmin();

// GET: List paid classes
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope'); // 'all' (admin only), 'my' (muallimah only), or 'public'/'approved'
    const status = searchParams.get('status');
    const batchId = searchParams.get('batch_id');

    // Public / Approved Scope: Accessible to all users (thalibah / public)
    if (scope === 'public' || scope === 'approved') {
      let query = supabaseAdmin
        .from('muallimah_paid_classes')
        .select(`
          *,
          muallimah:users!muallimah_paid_classes_muallimah_id_fkey(
            id,
            full_name,
            email,
            whatsapp
          ),
          batch:batches(id, name, status)
        `)
        .in('status', ['approved', 'active'])
        .order('created_at', { ascending: false });

      if (batchId && batchId !== 'all') {
        query = query.eq('batch_id', batchId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[Paid Classes Public API] Fetch error:', error);
        return ApiResponses.databaseError(error);
      }

      const classIds = (data || []).map((c: any) => c.id);
      const registrationCounts: Record<string, number> = {};
      const userRegisteredClassIds = new Set<string>();

      if (classIds.length > 0) {
        const { data: regData } = await supabaseAdmin
          .from('paid_class_registrations')
          .select('paid_class_id, status')
          .in('paid_class_id', classIds)
          .neq('status', 'cancelled');

        (regData || []).forEach((r: any) => {
          registrationCounts[r.paid_class_id] = (registrationCounts[r.paid_class_id] || 0) + 1;
        });

        if (authContext?.userId) {
          const { data: userRegs } = await supabaseAdmin
            .from('paid_class_registrations')
            .select('paid_class_id')
            .eq('user_id', authContext.userId)
            .neq('status', 'cancelled');

          (userRegs || []).forEach((ur: any) => {
            userRegisteredClassIds.add(ur.paid_class_id);
          });
        }
      }

      const enrichedClasses = (data || []).map((c: any) => {
        const enrolled = registrationCounts[c.id] || 0;
        const max = c.max_students || 10;
        return {
          ...c,
          enrolled_count: enrolled,
          remaining_slots: Math.max(0, max - enrolled),
          is_full: enrolled >= max,
          is_user_registered: userRegisteredClassIds.has(c.id),
        };
      });

      return ApiResponses.success({ classes: enrichedClasses });
    }

    // Authenticated scope ('my' or 'all')
    if (!authContext) {
      return ApiResponses.unauthorized('Silakan login terlebih dahulu');
    }

    const isAdmin = isUserAdmin(authContext);

    let query = supabaseAdmin
      .from('muallimah_paid_classes')
      .select(`
        *,
        muallimah:users!muallimah_paid_classes_muallimah_id_fkey(
          id,
          full_name,
          email,
          whatsapp
        ),
        batch:batches(id, name)
      `)
      .order('created_at', { ascending: false });

    // If not admin, or if requesting 'my', strictly restrict to own classes
    if (!isAdmin || scope === 'my') {
      query = query.eq('muallimah_id', authContext.userId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (batchId && batchId !== 'all') {
      query = query.eq('batch_id', batchId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Paid Classes API] Fetch error:', error);
      return ApiResponses.databaseError(error);
    }

    // Fetch registration count for classes
    const classIds = (data || []).map((c: any) => c.id);
    const registrationCounts: Record<string, number> = {};
    if (classIds.length > 0) {
      const { data: regData } = await supabaseAdmin
        .from('paid_class_registrations')
        .select('paid_class_id, status')
        .in('paid_class_id', classIds)
        .neq('status', 'cancelled');

      (regData || []).forEach((r: any) => {
        registrationCounts[r.paid_class_id] = (registrationCounts[r.paid_class_id] || 0) + 1;
      });
    }

    const enriched = (data || []).map((c: any) => {
      const enrolled = registrationCounts[c.id] || 0;
      const max = c.max_students || 10;
      return {
        ...c,
        enrolled_count: enrolled,
        remaining_slots: Math.max(0, max - enrolled),
        is_full: enrolled >= max,
      };
    });

    return ApiResponses.success({ classes: enriched });
  } catch (error) {
    console.error('[Paid Classes API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}

// POST: Create a new paid class submission
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Silakan login terlebih dahulu');
    }

    const body = await request.json();
    const {
      class_name,
      scheme = '80_20',
      subject_material,
      description,
      schedule_day,
      time_start,
      time_end,
      timezone = 'WIB',
      max_students = 10,
      fee_amount = 0,
      facilities,
      whatsapp_group_link,
      zoom_link,
      batch_id,
    } = body;

    if (!class_name || !subject_material || !schedule_day || !time_start || !time_end) {
      return ApiResponses.badRequest('Semua field utama wajib diisi (Judul kelas, materi, hari, dan jam bimbingan)');
    }

    // Fetch user full name for flyer prompt
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', authContext.userId)
      .single();

    const muallimahName = userProfile?.full_name || 'Muallimah MTI';

    const flyerPrompt = generateFlyerAIPrompt({
      class_name,
      muallimah_name: muallimahName,
      subject_material,
      schedule_day,
      time_start,
      time_end,
      fee_amount: Number(fee_amount) || 0,
      max_students: Number(max_students) || 10,
      facilities,
    });

    const newRecord = {
      muallimah_id: authContext.userId,
      batch_id: batch_id || null,
      class_name: class_name.trim(),
      scheme,
      subject_material: subject_material.trim(),
      description: description?.trim() || null,
      schedule_day: schedule_day.trim(),
      time_start: time_start.trim(),
      time_end: time_end.trim(),
      timezone,
      max_students: parseInt(max_students) || 10,
      fee_amount: parseFloat(fee_amount) || 0,
      facilities: facilities?.trim() || 'Ruang Zoom MTI, E-Sertifikat, Rekaman Pertemuan, Pendampingan Musyrifah',
      whatsapp_group_link: whatsapp_group_link?.trim() || null,
      zoom_link: zoom_link?.trim() || null,
      flyer_prompt_ai: flyerPrompt,
      status: 'pending', // Pending review from admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('muallimah_paid_classes')
      .insert(newRecord)
      .select()
      .single();

    if (insertError) {
      console.error('[Paid Classes API] Insert error:', insertError);
      return ApiResponses.databaseError(insertError);
    }

    return ApiResponses.success({
      message: 'Alhamdulillah, pengajuan Kelas Berbayar MTI berhasil dikirim!',
      class: inserted
    });
  } catch (error) {
    console.error('[Paid Classes API] Post error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
