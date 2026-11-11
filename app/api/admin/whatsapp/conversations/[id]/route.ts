import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import {
  getConversationById,
  getConversationMessages,
  markConversationAsRead,
  updateConversationStatus,
} from '@/lib/services/whatsapp-chat';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    const conversation = await getConversationById(id);
    if (!conversation) {
      return ApiResponses.notFound('Percakapan tidak ditemukan');
    }

    const messages = await getConversationMessages(id);

    return ApiResponses.success({
      conversation,
      messages,
    });
  } catch (error: any) {
    console.error('[Admin WhatsApp Conversation GET]', error);
    return ApiResponses.serverError(error.message || 'Gagal memuat percakapan');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.markAsRead) {
      await markConversationAsRead(id);
    }

    if (body.status && ['open', 'resolved', 'archived'].includes(body.status)) {
      await updateConversationStatus(id, body.status);
    }

    const updated = await getConversationById(id);
    return ApiResponses.success(updated);
  } catch (error: any) {
    console.error('[Admin WhatsApp Conversation PATCH]', error);
    return ApiResponses.serverError(error.message || 'Gagal memperbarui status percakapan');
  }
}
