import { NextRequest, NextResponse } from 'next/server';
import {
  getHalaqahsImpl,
  updateHalaqahImpl,
  deleteHalaqahImpl,
  assignThalibahToHalaqahImpl,
  autoCreateSimpleHalaqahImpl,
  addThalibahToHalaqahImpl,
  getEligibleThalibahForHalaqahImpl,
  searchUsersForAsistenImpl,
  assignAsistenImpl,
  removeAsistenImpl,
} from '@/lib/admin/halaqah-service';

const handlers: Record<string, (...args: any[]) => Promise<any>> = {
  getHalaqahs: getHalaqahsImpl,
  updateHalaqah: updateHalaqahImpl,
  deleteHalaqah: deleteHalaqahImpl,
  assignThalibahToHalaqah: assignThalibahToHalaqahImpl,
  autoCreateSimpleHalaqah: autoCreateSimpleHalaqahImpl,
  addThalibahToHalaqah: addThalibahToHalaqahImpl,
  getEligibleThalibahForHalaqah: getEligibleThalibahForHalaqahImpl,
  searchUsersForAsisten: searchUsersForAsistenImpl,
  assignAsisten: assignAsistenImpl,
  removeAsisten: removeAsistenImpl,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const args = Array.isArray(body?.args) ? body.args : [];

    if (!action || typeof action !== 'string' || !handlers[action]) {
      return NextResponse.json(
        { success: false, error: 'Action halaqah tidak valid.' },
        { status: 400 }
      );
    }

    const result = await handlers[action](...args);
    const status = result?.success
      ? 200
      : result?.error?.includes('Unauthorized')
        ? 401
        : result?.error?.includes('Forbidden')
          ? 403
          : 400;

    return NextResponse.json(result ?? { success: false, error: 'Empty response' }, { status });
  } catch (error: any) {
    console.error('[API /api/admin/halaqah/actions POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Terjadi kesalahan pada server halaqah.' },
      { status: 500 }
    );
  }
}
