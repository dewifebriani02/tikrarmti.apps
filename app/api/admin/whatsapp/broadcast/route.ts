import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService, ActiveThalibahRecipient } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { 
      batchId, 
      recipientUserIds, 
      messageTemplate, 
      singleRecipient 
    } = body;

    if (!messageTemplate || !messageTemplate.trim()) {
      return ApiResponses.badRequest('Template pesan wajib diisi');
    }

    // Kasus 1: Pengiriman single recipient terpersonalisasi (biasa dipanggil dari UI runner)
    if (singleRecipient) {
      const recipient = singleRecipient as ActiveThalibahRecipient;
      const formattedMessage = personalizeMessage(messageTemplate, recipient);
      const res = await whatsappService.sendTextMessage(recipient.whatsapp, formattedMessage);

      return ApiResponses.success({
        userId: recipient.userId,
        name: recipient.fullName,
        whatsapp: recipient.whatsapp,
        success: res.success,
        messageId: res.messageId,
        error: res.error,
      });
    }

    // Kasus 2: Mengambil daftar thalibah dari view v_active_thalibah
    let targets = await whatsappService.getActiveThalibahRecipients(batchId);

    // Filter jika ada ID tertentu yang dipilih
    if (Array.isArray(recipientUserIds) && recipientUserIds.length > 0) {
      const idSet = new Set(recipientUserIds);
      targets = targets.filter(t => idSet.has(t.userId));
    }

    return ApiResponses.success({
      total: targets.length,
      recipients: targets,
      samplePreview: targets.length > 0 ? personalizeMessage(messageTemplate, targets[0]) : null,
    }, 'Daftar penerima broadcast berhasil dipersiapkan dari v_active_thalibah');

  } catch (error) {
    console.error('[WhatsApp Broadcast Route] Error:', error);
    return ApiResponses.serverError(error instanceof Error ? error.message : 'Internal server error');
  }
}

/**
 * Menggantikan variabel template dengan data thalibah
 */
function personalizeMessage(template: string, thalibah: ActiveThalibahRecipient): string {
  return template
    .replace(/\{nama\}/gi, thalibah.fullName || 'Thalibah')
    .replace(/\{kunyah\}/gi, thalibah.namaKunyah || thalibah.fullName || 'Ukhti')
    .replace(/\{juz\}/gi, thalibah.confirmedChosenJuz || '-')
    .replace(/\{halaqah\}/gi, thalibah.halaqahName || 'Halaqah Tikrar')
    .replace(/\{nomor_induk\}/gi, thalibah.studentIdNumber || '-');
}
