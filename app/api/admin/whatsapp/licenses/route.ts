import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const data = await whatsappService.getLicenses();
    return ApiResponses.success(data);
  } catch (error) {
    console.error('[WhatsApp Licenses Route] Error:', error);
    return ApiResponses.serverError((error as Error).message || 'Gagal memuat daftar lisensi WatZap');
  }
}
