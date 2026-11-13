import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { getWhatsAppBotConfig, updateWhatsAppBotConfig } from '@/lib/services/whatsapp-chat';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const config = await getWhatsAppBotConfig();
    return ApiResponses.success(config);
  } catch (error: any) {
    console.error('[Admin WhatsApp Bot Settings GET]', error);
    return ApiResponses.serverError(error.message || 'Gagal mengambil pengaturan bot WhatsApp');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const updated = await updateWhatsAppBotConfig({
      enabled: body.enabled,
      auto_reply_delay_ms: body.auto_reply_delay_ms,
      escalation_admin_phones: body.escalation_admin_phones,
      system_prompt_extra: body.system_prompt_extra,
    });

    return ApiResponses.success(updated, 'Pengaturan Asisten AI WhatsApp berhasil disimpan');
  } catch (error: any) {
    console.error('[Admin WhatsApp Bot Settings PATCH]', error);
    return ApiResponses.serverError(error.message || 'Gagal menyimpan pengaturan bot WhatsApp');
  }
}
