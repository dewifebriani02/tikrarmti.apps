import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId') || undefined;

    // Ambil daftar batch beserta jumlah thalibah aktif dari v_active_thalibah
    const { rows: batches } = await query(
      `SELECT 
         b.id, 
         b.name, 
         COUNT(v.user_id) FILTER (WHERE v.whatsapp IS NOT NULL AND TRIM(v.whatsapp) != '') AS active_count
       FROM batches b
       LEFT JOIN v_active_thalibah v ON v.batch_id = b.id
       GROUP BY b.id, b.name
       ORDER BY b.created_at DESC`
    );

    // Ambil detail thalibah aktif langsung dari view v_active_thalibah
    const recipients = await whatsappService.getActiveThalibahRecipients(batchId);

    return ApiResponses.success({
      batches,
      totalRecipients: recipients.length,
      recipients,
    });
  } catch (error) {
    console.error('[WhatsApp Recipients Route] Error:', error);
    return ApiResponses.serverError(error instanceof Error ? error.message : 'Internal server error');
  }
}
