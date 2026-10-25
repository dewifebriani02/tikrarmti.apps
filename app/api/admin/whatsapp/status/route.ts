import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const status = await whatsappService.getStatus();
    return ApiResponses.success(status);
  } catch (error) {
    console.error('[WhatsApp Status Route] Error:', error);
    return ApiResponses.serverError((error as Error).message || 'Internal server error');
  }
}
