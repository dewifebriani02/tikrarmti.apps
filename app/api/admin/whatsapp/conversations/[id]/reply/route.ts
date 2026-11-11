import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponses } from '@/lib/api-responses';
import { sendReplyMessage } from '@/lib/services/whatsapp-chat';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const message = body.message;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return ApiResponses.badRequest('Pesan balasan wajib diisi');
    }

    const currentUser = await getCurrentUser();
    const adminName = currentUser?.full_name || 'Admin MTI';
    const adminId = currentUser?.id;

    const result = await sendReplyMessage({
      conversationId: id,
      messageText: message.trim(),
      adminName,
      adminId,
    });

    if (!result.success) {
      return ApiResponses.badRequest(result.error || 'Gagal mengirim pesan balasan');
    }

    return ApiResponses.success(result.message);
  } catch (error: any) {
    console.error('[Admin WhatsApp Reply POST]', error);
    return ApiResponses.serverError(error.message || 'Gagal mengirim balasan WhatsApp');
  }
}
