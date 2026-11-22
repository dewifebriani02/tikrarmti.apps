import { NextRequest, NextResponse } from 'next/server';
import { addThalibahToHalaqahImpl, getEligibleThalibahForHalaqahImpl } from '@/lib/admin/halaqah-service';

/**
 * POST /api/admin/daftar-ulang/halaqah/add-thalibah
 * Add or move thalibah to halaqah
 *
 * Requires thalibah to be enrolled (completed daftar ulang)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { halaqahId, thalibahIds, halaqahType, batchId } = body;

    console.log('[API add-thalibah] POST request:', { halaqahId, thalibahIds, halaqahType });

    // Validate required fields
    if (!halaqahId) {
      return NextResponse.json(
        { error: 'Halaqah ID is required' },
        { status: 400 }
      );
    }

    if (!thalibahIds || !Array.isArray(thalibahIds) || thalibahIds.length === 0) {
      return NextResponse.json(
        { error: 'Thalibah IDs is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!halaqahType) {
      return NextResponse.json(
        { error: 'Halaqah type is required' },
        { status: 400 }
      );
    }

    const result = await addThalibahToHalaqahImpl({
      halaqahId,
      thalibahIds,
      halaqahType
    });

    console.log('[API add-thalibah] Service result:', result);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add thalibah' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error: any) {
    console.error('[API add-thalibah] POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/daftar-ulang/halaqah/add-thalibah?batch_id=xxx
 * Get eligible thalibah (completed daftar ulang) that can be added to halaqah
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id') || undefined;

    console.log('[API add-thalibah] GET request, batchId:', batchId);

    const result = await getEligibleThalibahForHalaqahImpl(batchId);

    console.log('[API add-thalibah] Service result:', result);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch eligible thalibah' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || []
    });

  } catch (error: any) {
    console.error('[API add-thalibah] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
