import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { to, message, templateName, components, ccNumbers, ccGroupIds } = body;

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

    // Tembusan (CC) ke admin atau grup WhatsApp jika ada
    const ccResults: Array<{ to: string; type: 'admin' | 'group'; success: boolean; messageId?: string; error?: string }> = [];
    if (Array.isArray(ccNumbers) && ccNumbers.length > 0) {
      const ccNote = `\n\n_📌 [Tembusan Pengiriman Admin MTI ke ${to}]_`;
      const fullCcMessage = `${message || ''}${ccNote}`;

      for (const ccNum of ccNumbers) {
        if (!ccNum || typeof ccNum !== 'string') continue;
        try {
          const ccRes = await whatsappService.sendTextMessage(ccNum, fullCcMessage);
          ccResults.push({
            to: ccNum,
            type: 'admin',
            success: ccRes.success,
            messageId: ccRes.messageId,
            error: ccRes.error,
          });
        } catch (ccErr) {
          ccResults.push({
            to: ccNum,
            type: 'admin',
            success: false,
            error: (ccErr as Error).message,
          });
        }
      }
    }

    if (Array.isArray(ccGroupIds) && ccGroupIds.length > 0) {
      const ccNote = `\n\n_📌 [Tembusan Pengiriman Admin MTI ke ${to}]_`;
      const fullCcMessage = `${message || ''}${ccNote}`;

      for (const gid of ccGroupIds) {
        if (!gid || typeof gid !== 'string') continue;
        try {
          const grpRes = await whatsappService.sendGroupMessage(gid, fullCcMessage);
          ccResults.push({
            to: gid,
            type: 'group',
            success: grpRes.success,
            messageId: grpRes.messageId,
            error: grpRes.error,
          });
        } catch (grpErr) {
          ccResults.push({
            to: gid,
            type: 'group',
            success: false,
            error: (grpErr as Error).message,
          });
        }
      }
    }

    return ApiResponses.success({
      ...result,
      ccResults: ccResults.length > 0 ? ccResults : undefined,
    }, 'Pesan WhatsApp berhasil diproses untuk dikirim');
  } catch (error) {
    console.error('[WhatsApp Send Route] Error:', error);
    return ApiResponses.serverError(error instanceof Error ? error.message : 'Internal server error');
  }
}
