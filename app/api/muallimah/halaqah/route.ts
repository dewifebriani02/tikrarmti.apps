import { createClient } from '@/lib/supabase/server';
import { requireAnyRole, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { parseBlokField } from '@/lib/blok';

export async function GET(request: Request) {
  try {
    // 1. Authorization check - Standardized via requireAnyRole
    const authError = await requireAnyRole(['admin', 'muallimah']);
    if (authError) return authError;

    const context = await getAuthorizationContext();
    if (!context) return ApiResponses.unauthorized('Unable to get authorization context');

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const muallimahId = searchParams.get('muallimah_id');

    // Admin can view specific teacher's (muallimah) halaqah
    const targetMuallimahId = muallimahId || context.userId;

    // Get halaqah where muallimah is assigned
    const query = supabase
      .from('halaqah')
      .select(`
        *,
        program:programs(id, name, class_type),
        muallimah:users(id, full_name, nama_kunyah, email),
        students:halaqah_students(
          id,
          thalibah_id,
          status,
          assigned_at,
          thalibah:users(id, full_name, nama_kunyah, whatsapp, email)
        )
      `)
      .eq('muallimah_id', targetMuallimahId)
      .order('created_at', { ascending: false });

    const { data: halaqah, error } = await query;

    if (error) {
      console.error('[Muallimah Halaqah API] Database error:', error);
      return ApiResponses.databaseError(error);
    }

    // For each halaqah, get thalibah progress data
    const halaqahWithProgress = await Promise.all(
      (halaqah || []).map(async (h: any) => {
        // Get thalibah IDs from this halaqah
        const thalibahIds = h.students?.map((s: any) => s.thalibah_id) || [];

        // Get jurnal progress for each thalibah
        const { data: jurnalData } = await supabase
          .from('jurnal_records')
          .select('user_id, blok, tanggal_setor')
          .in('user_id', thalibahIds);

        // Get tashih progress for each thalibah
        const { data: tashihData } = await supabase
          .from('tashih_records')
          .select('user_id, blok, waktu_tashih')
          .in('user_id', thalibahIds);

        // Calculate progress for each thalibah
        const studentsWithProgress = (h.students || []).map((student: any) => {
          const thalibahId = student.thalibah_id;

          // Count jurnal blocks completed
          const thalibahJurnal = jurnalData?.filter((j: any) => j.user_id === thalibahId) || [];
          const jurnalBlocks = thalibahJurnal.reduce((count: number, record: any) => {
            return count + parseBlokField(record.blok).length;
          }, 0);

          // Count tashih blocks completed
          const thalibahTashih = tashihData?.filter((t: any) => t.user_id === thalibahId) || [];
          const tashihBlocks = thalibahTashih.reduce((count: number, record: any) => {
            return count + parseBlokField(record.blok).length;
          }, 0);

          return {
            ...student,
            progress: {
              jurnal_blocks_completed: jurnalBlocks,
              tashih_blocks_completed: tashihBlocks,
              total_blocks: 40, // 40 blocks total (4 blocks/week * 10 weeks)
              jurnal_percentage: Math.round((jurnalBlocks / 40) * 100),
              tashih_percentage: Math.round((tashihBlocks / 40) * 100),
            },
          };
        });

        return {
          ...h,
          students: studentsWithProgress,
        };
      })
    );

    return ApiResponses.success(halaqahWithProgress || []);
  } catch (error) {
    console.error('[Muallimah Halaqah API] Unexpected error:', error);
    return ApiResponses.handleUnknown(error);
  }
}
