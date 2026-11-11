import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { getConversations } from '@/lib/services/whatsapp-chat';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getConversations({ search, status, limit, offset });

    return ApiResponses.success(result);
  } catch (error: any) {
    console.error('[Admin WhatsApp Conversations GET]', error);
    return ApiResponses.serverError(error.message || 'Gagal mengambil data percakapan');
  }
}
