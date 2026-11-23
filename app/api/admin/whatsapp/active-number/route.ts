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
    const action = typeof body.action === 'string' ? body.action.trim() : undefined;
    const keyHash = typeof body.keyHash === 'string' ? body.keyHash.trim() : undefined;
    const waNumber = typeof body.waNumber === 'string' ? body.waNumber.trim() : undefined;
    const allowAutoFallback =
      typeof body.allowAutoFallback === 'boolean' ? body.allowAutoFallback : undefined;

    let updatedBy: string | null = null;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      updatedBy = data?.user?.email || data?.user?.id || null;
    } catch {
      // Non-fatal
    }

    if (action === 'disconnect_mti' || action === 'reconnect_mti') {
      if (!keyHash && !waNumber) {
        return ApiResponses.badRequest('Parameter keyHash atau waNumber wajib diisi');
      }

      const excluded = action === 'disconnect_mti';
      const exclusionRes = await whatsappService.setLicenseExclusion({
        keyHash,
        waNumber,
        excluded,
        updatedBy,
      });

      if (!exclusionRes.success) {
        return ApiResponses.badRequest(
          exclusionRes.error || 'Gagal memperbarui status koneksi nomor di MTI'
        );
      }

      const licenses = await whatsappService.getLicenses();
      return ApiResponses.success(
        {
          status: exclusionRes.status,
          licenses,
          excluded,
        },
        excluded
          ? 'Nomor berhasil diputuskan dari MTI (tetap aktif di WatZap / aplikasi lain)'
          : 'Nomor berhasil dihubungkan kembali ke MTI'
      );
    }

    if (!keyHash && !waNumber && allowAutoFallback === undefined) {
      return ApiResponses.badRequest('Parameter keyHash, waNumber, atau allowAutoFallback wajib diisi');
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
