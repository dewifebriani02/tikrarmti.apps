import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { createClient } from '@/lib/supabase/server';
import { whatsappService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const keyHash = typeof body.keyHash === 'string' ? body.keyHash.trim() : undefined;
    const waNumber = typeof body.waNumber === 'string' ? body.waNumber.trim() : undefined;
    const allowAutoFallback =
      typeof body.allowAutoFallback === 'boolean' ? body.allowAutoFallback : undefined;

    if (!keyHash && !waNumber && allowAutoFallback === undefined) {
      return ApiResponses.badRequest('Parameter keyHash, waNumber, atau allowAutoFallback wajib diisi');
    }

    let updatedBy: string | null = null;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      updatedBy = data?.user?.email || data?.user?.id || null;
    } catch {
      // Non-fatal
    }

    const switchRes = await whatsappService.switchActiveLicense({
      keyHash,
      waNumber,
      allowAutoFallback,
      updatedBy,
    });

    if (!switchRes.success) {
      return ApiResponses.badRequest(switchRes.error || 'Gagal mengganti nomor WatZap aktif');
    }

    const licenses = await whatsappService.getLicenses();
    return ApiResponses.success(
      {
        status: switchRes.status,
        licenses,
      },
      'Nomor WhatsApp aktif berhasil diperbarui'
    );
  } catch (error) {
    console.error('[WhatsApp Active Number Route] Error:', error);
    return ApiResponses.serverError((error as Error).message || 'Gagal menyimpan nomor WatZap aktif');
  }
}
