import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';
import { formatIndonesianDate } from '@/lib/services/exam-reminder';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatTimestampWib(isoStr?: string | null, fallbackLabel: string = '-'): string {
  if (!isoStr) return fallbackLabel;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return fallbackLabel;
  const datePart = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  })
    .format(d)
    .replace('.', ':');
  return `${datePart} pukul ${timePart} WIB`;
}

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId') || undefined;
    const filter = (searchParams.get('filter') || 'all').toLowerCase(); // 'all' | 'missing_written_exam' | 'missing_testimonial'

    // Ambil daftar batch beserta jumlah thalibah aktif + jadwal ujian akhir tulisan
    const { rows: rawBatches } = await query(
      `SELECT 
         b.id, 
         b.name, 
         b.final_exam_start_date,
         b.final_exam_end_date,
         COUNT(v.user_id) FILTER (WHERE v.whatsapp IS NOT NULL AND TRIM(v.whatsapp) != '') AS active_count,
         ws.exam_date::text AS written_exam_date,
         COALESCE(ws.end_date, ws.exam_date)::text AS written_end_date,
         ws.start_time::text AS written_start_time,
         ws.end_time::text AS written_end_time
       FROM batches b
       LEFT JOIN v_active_thalibah v ON v.batch_id = b.id
       LEFT JOIN LATERAL (
         SELECT s.exam_date, s.end_date, s.start_time, s.end_time
         FROM final_exam_schedules s
         WHERE s.batch_id = b.id AND s.exam_type = 'written' AND s.status = 'active'
         ORDER BY s.updated_at DESC
         LIMIT 1
       ) ws ON true
       GROUP BY b.id, b.name, b.final_exam_start_date, b.final_exam_end_date, ws.exam_date, ws.end_date, ws.start_time, ws.end_time, b.created_at
       ORDER BY b.created_at DESC`
    );

    const batchMetaMap = new Map<
      string,
      {
        name: string;
        examOpenLabel: string;
        examCloseLabel: string;
      }
    >();

    const batches = rawBatches.map((b: any) => {
      let examOpenLabel = 'Sabtu, 28 November 2026 pukul 00:00 WIB';
      let examCloseLabel = 'Sabtu, 5 Desember 2026 pukul 00:00 WIB';

      if (b.written_exam_date) {
        const sTime = (b.written_start_time || '00:00').slice(0, 5);
        const eTime = (b.written_end_time || '23:59').slice(0, 5);
        examOpenLabel = `${formatIndonesianDate(b.written_exam_date)} pukul ${sTime} WIB`;
        examCloseLabel = `${formatIndonesianDate(b.written_end_date || b.written_exam_date)} pukul ${eTime} WIB`;
      } else if (b.final_exam_start_date || b.final_exam_end_date) {
        examOpenLabel = formatTimestampWib(b.final_exam_start_date, examOpenLabel);
        examCloseLabel = formatTimestampWib(b.final_exam_end_date || b.final_exam_start_date, examCloseLabel);
      }

      batchMetaMap.set(b.id, {
        name: b.name,
        examOpenLabel,
        examCloseLabel,
      });

      return {
        id: b.id,
        name: b.name,
        active_count: b.active_count,
        exam_open_label: examOpenLabel,
        exam_close_label: examCloseLabel,
      };
    });

    // Ambil detail thalibah aktif langsung dari view v_active_thalibah
    const baseRecipients = await whatsappService.getActiveThalibahRecipients(batchId);

    // Ambil daftar user_id yang sudah menyelesaikan Ujian Akhir Tulisan (final-exam)
    const { rows: completedWrittenRows } = await query(
      batchId
        ? `SELECT DISTINCT ea.user_id
           FROM exam_attempts ea
           JOIN pendaftaran_tikrar_tahfidz ptt ON ptt.id = ea.registration_id
           WHERE ptt.batch_id = $1
             AND ea.exam_type = 'final-exam'
             AND ea.status IN ('submitted', 'graded')`
        : `SELECT DISTINCT ea.user_id
           FROM exam_attempts ea
           WHERE ea.exam_type = 'final-exam'
             AND ea.status IN ('submitted', 'graded')`,
      batchId ? [batchId] : []
    );
    const completedWrittenSet = new Set<string>(completedWrittenRows.map((r: any) => r.user_id));

    // Ambil daftar user_id yang sudah mengisi testimoni pada batch terkait
    const selectedBatchName = batchId ? batchMetaMap.get(batchId)?.name : undefined;
    const { rows: submittedTestiRows } = await query(
      selectedBatchName
        ? `SELECT DISTINCT user_id
           FROM testimonials
           WHERE user_id IS NOT NULL
             AND batch_name = $1`
        : `SELECT DISTINCT user_id
           FROM testimonials
           WHERE user_id IS NOT NULL`,
      selectedBatchName ? [selectedBatchName] : []
    );
    const submittedTestiSet = new Set<string>(submittedTestiRows.map((r: any) => r.user_id));

    const enrichedRecipients = baseRecipients.map((r) => {
      const meta = batchMetaMap.get(r.batchId);
      const hasCompletedWrittenExam = completedWrittenSet.has(r.userId);
      const hasSubmittedTestimonial = submittedTestiSet.has(r.userId);
      return {
        ...r,
        batchName: meta?.name || 'Tikrar Tahfidz MTI Batch 3',
        examOpenDateFormatted: meta?.examOpenLabel || 'Sabtu, 28 November 2026 pukul 00:00 WIB',
        examCloseDateFormatted: meta?.examCloseLabel || 'Sabtu, 5 Desember 2026 pukul 00:00 WIB',
        hasCompletedWrittenExam,
        hasSubmittedTestimonial,
      };
    });

    const filterCounts = {
      all: enrichedRecipients.length,
      missing_written_exam: enrichedRecipients.filter((r) => !r.hasCompletedWrittenExam).length,
      missing_testimonial: enrichedRecipients.filter((r) => !r.hasSubmittedTestimonial).length,
    };

    const filteredRecipients = enrichedRecipients.filter((r) => {
      if (filter === 'missing_written_exam') return !r.hasCompletedWrittenExam;
      if (filter === 'missing_testimonial') return !r.hasSubmittedTestimonial;
      return true;
    });

    // Ambil daftar admin terdaftar yang nomor WhatsApp-nya aktif untuk opsi tembusan (CC)
    const { rows: admins } = await query(
      `SELECT DISTINCT ON (whatsapp)
         id, 
         full_name, 
         role, 
         roles,
         whatsapp,
         email
       FROM users 
       WHERE (role IN ('admin', 'super_admin') OR 'admin' = ANY(roles) OR 'super_admin' = ANY(roles))
         AND whatsapp IS NOT NULL AND TRIM(whatsapp) != ''
         AND is_active = true
       ORDER BY whatsapp, full_name ASC`
    );

    const formattedAdmins = admins.map((a) => {
      const userRoles = Array.isArray(a.roles) ? a.roles : [];
      let displayRole = a.role;
      if (a.role === 'super_admin' || userRoles.includes('super_admin')) {
        displayRole = 'super_admin';
      } else if (a.role === 'admin' || userRoles.includes('admin')) {
        displayRole = 'admin';
      }
      return {
        id: a.id,
        full_name: a.full_name,
        role: displayRole,
        roles: a.roles,
        whatsapp: a.whatsapp,
        email: a.email,
      };
    });

    return ApiResponses.success({
      batches,
      filter,
      filterCounts,
      totalRecipients: filteredRecipients.length,
      recipients: filteredRecipients,
      allRecipients: enrichedRecipients,
      admins: formattedAdmins.sort((a, b) => a.full_name.localeCompare(b.full_name)),
    });
  } catch (error) {
    console.error('[WhatsApp Recipients Route] Error:', error);
    return ApiResponses.serverError(error instanceof Error ? error.message : 'Internal server error');
  }
}
