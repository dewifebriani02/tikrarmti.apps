import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { groupId, message } = body;

    if (!groupId) {
      return ApiResponses.badRequest('Parameter "groupId" (ID Grup WhatsApp berakhiran @g.us) wajib diisi');
    }

    if (!message) {
      return ApiResponses.badRequest('Parameter "message" wajib diisi');
    }

    const result = await whatsappService.sendGroupMessage(groupId, message);

    if (!result.success) {
      return ApiResponses.badRequest(result.error || 'Gagal mengirim pesan ke grup WhatsApp');
    }

    return ApiResponses.success(result, 'Pesan WhatsApp berhasil dikirim ke grup');
  } catch (error) {
    console.error('[WhatsApp Send Group Route] Error:', error);
    return ApiResponses.serverError(error instanceof Error ? error.message : 'Internal server error');
  }
}
