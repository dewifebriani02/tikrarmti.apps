import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { to, message, templateName, components } = body;

    if (!to) {
      return ApiResponses.badRequest('Parameter "to" (nomor WhatsApp tujuan) wajib diisi');
    }

    let result;
    if (templateName) {
      result = await whatsappService.sendTemplateMessage(
        to,
        templateName,
        'id',
        components
      );
    } else {
      if (!message) {
        return ApiResponses.badRequest('Parameter "message" wajib diisi jika tidak menggunakan template');
      }
      result = await whatsappService.sendTextMessage(to, message);
    }

    if (!result.success) {
      return ApiResponses.badRequest(result.error || 'Gagal mengirim pesan WhatsApp');
    }

    return ApiResponses.success(result, 'Pesan WhatsApp berhasil diproses untuk dikirim');
  } catch (error) {
    console.error('[WhatsApp Send Route] Error:', error);
    return ApiResponses.serverError(error instanceof Error ? error.message : 'Internal server error');
  }
}
