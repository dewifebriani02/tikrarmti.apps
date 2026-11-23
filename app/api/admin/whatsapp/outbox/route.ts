import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { getWhatsAppOutboxLogs } from '@/lib/services/whatsapp-outbox';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const statusParam = searchParams.get('status');
    const status =
      statusParam === 'sent' || statusParam === 'failed' ? statusParam : 'all';
    const sourceTag = searchParams.get('sourceTag') || 'all';
    const senderNumber = searchParams.get('senderNumber') || 'all';
    const onlyFallback = searchParams.get('onlyFallback') === 'true';
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const data = await getWhatsAppOutboxLogs({
      search,
      status,
      sourceTag,
      senderNumber,
      onlyFallback,
      limit,
      offset,
    });

    return ApiResponses.success(data);
  } catch (error) {
    console.error('[Admin WhatsApp Outbox GET]', error);
    return ApiResponses.serverError(
      error instanceof Error ? error.message : 'Gagal memuat riwayat pesan keluar (Outbox)'
    );
  }
}
