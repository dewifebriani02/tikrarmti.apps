import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { computeHalaqahOfTheWeek } from '@/lib/services/halaqah-of-the-week';

export async function GET(request: Request) {
  try {
    // 1. Authorization check
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Not authenticated');
    }
    const isOnlyThalibah = authContext.roles.includes('thalibah') && !authContext.roles.includes('admin') && !authContext.roles.includes('musyrifah');

    const url = new URL(request.url);
    const batchId = url.searchParams.get('batch_id') || undefined;

    const { topHalaqah, allHalaqahs, userRank } = await computeHalaqahOfTheWeek(
      batchId,
      authContext.userId,
      isOnlyThalibah
    );

    return ApiResponses.success(
      { topHalaqah, allHalaqahs, userRank },
      'Halaqah of the week retrieved successfully'
    );
  } catch (error: any) {
    console.error('[Halaqah of the week API] Unexpected error:', error);
    return ApiResponses.error('SERVER_ERROR', error?.message || 'Terjadi kesalahan internal server.', { stack: error?.stack }, 500);
  }
}
