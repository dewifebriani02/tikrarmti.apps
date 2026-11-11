import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { getWatZapWebhookStatus, setWatZapWebhookUrl } from '@/lib/services/whatsapp-chat';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const status = await getWatZapWebhookStatus();
    return ApiResponses.success(status);
  } catch (error: any) {
    console.error('[Admin WhatsApp Webhook Status GET]', error);
    return ApiResponses.serverError(error.message || 'Gagal memeriksa status webhook WatZap');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const targetUrl = body.url || 'https://markaztikrar.id/api/webhooks/whatsapp';

    const result = await setWatZapWebhookUrl(targetUrl);
    if (!result.success) {
      return ApiResponses.badRequest(result.message || 'Gagal menyetel webhook WatZap');
    }

    return ApiResponses.success(result);
  } catch (error: any) {
    console.error('[Admin WhatsApp Webhook Status POST]', error);
    return ApiResponses.serverError(error.message || 'Gagal memperbarui webhook WatZap');
  }
}
