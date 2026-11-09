import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { whatsappService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';

// In-memory cache for groups to prevent excessive WatZap API calls
let cachedGroups: any[] | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const now = Date.now();

    if (!forceRefresh && cachedGroups && (now - lastFetchedAt < CACHE_TTL_MS)) {
      return ApiResponses.success({
        groups: cachedGroups,
        fromCache: true,
        lastFetchedAt: new Date(lastFetchedAt).toISOString(),
      }, 'Daftar grup WhatsApp berhasil dimuat dari cache');
    }

    const result = await whatsappService.getGroups();
    if (!result.success) {
      // Fallback to cache if available
      if (cachedGroups) {
        return ApiResponses.success({
          groups: cachedGroups,
          fromCache: true,
          warning: result.error,
          lastFetchedAt: new Date(lastFetchedAt).toISOString(),
        }, 'Gagal memuat grup terbaru, menampilkan data cache');
      }
      return ApiResponses.badRequest(result.error || 'Gagal mengambil daftar grup WhatsApp');
    }

    cachedGroups = result.groups;
    lastFetchedAt = now;

    return ApiResponses.success({
      groups: result.groups,
      fromCache: false,
      lastFetchedAt: new Date(lastFetchedAt).toISOString(),
    }, `Berhasil memuat ${result.groups.length} grup WhatsApp`);
  } catch (error) {
    console.error('[WhatsApp Groups Route] Error:', error);
    return ApiResponses.serverError(error instanceof Error ? error.message : 'Internal server error');
  }
}
