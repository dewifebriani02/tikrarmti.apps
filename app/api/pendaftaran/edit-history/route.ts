import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { queryOne } from '@/lib/db';
import {
  getRegistrationEditHistory,
  resolveBatchEditPhase,
  resolvePaidClassEditPhase,
  type RegistrationEntityType,
} from '@/lib/pendaftaran/edit-history';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: RegistrationEntityType[] = [
  'tikrar',
  'pra_tikrar',
  'muallimah',
  'musyrifah',
  'paid_class',
  'paid_class_registration',
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const response = new NextResponse();
    const auth = await getAuthorizationContext({ response });
    if (!auth) return ApiResponses.unauthorized();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as RegistrationEntityType | null;
    const entityId = searchParams.get('entityId');

    if (!entityType || !ALLOWED_TYPES.includes(entityType)) {
      return ApiResponses.badRequest('entityType tidak valid');
    }
    if (!entityId || !UUID_RE.test(entityId)) {
      return ApiResponses.badRequest('entityId tidak valid');
    }

    const isAdmin = auth.roles.includes('admin');
    let ownerId: string | null = null;
    let batchId: string | null = searchParams.get('batchId');
    let regStatus: string | null = null;
    let paidClassId: string | null = null;

    if (entityType === 'tikrar' || entityType === 'pra_tikrar') {
      const row = await queryOne<{ user_id: string; batch_id: string | null }>(
        `SELECT user_id::text, batch_id::text FROM public.pendaftaran_tikrar_tahfidz WHERE id = $1 LIMIT 1`,
        [entityId]
      );
      if (!row) return ApiResponses.notFound('Data pendaftaran tidak ditemukan');
      ownerId = row.user_id;
      batchId = row.batch_id;
    } else if (entityType === 'muallimah') {
      const row = await queryOne<{ user_id: string; batch_id: string | null }>(
        `SELECT user_id::text, batch_id::text FROM public.muallimah_akads WHERE id = $1 LIMIT 1`,
        [entityId]
      );
      if (row) {
        ownerId = row.user_id;
        batchId = row.batch_id;
      } else {
        const regRow = await queryOne<{ user_id: string; batch_id: string | null }>(
          `SELECT user_id::text, batch_id::text FROM public.muallimah_registrations WHERE id = $1 LIMIT 1`,
          [entityId]
        );
        if (!regRow) return ApiResponses.notFound('Data pendaftaran Mu\'allimah tidak ditemukan');
        ownerId = regRow.user_id;
        batchId = regRow.batch_id;
      }
    } else if (entityType === 'musyrifah') {
      const row = await queryOne<{ user_id: string; batch_id: string | null }>(
        `SELECT user_id::text, batch_id::text FROM public.musyrifah_registrations WHERE id = $1 LIMIT 1`,
        [entityId]
      );
      if (!row) return ApiResponses.notFound('Data pendaftaran Musyrifah tidak ditemukan');
      ownerId = row.user_id;
      batchId = row.batch_id;
    } else if (entityType === 'paid_class') {
      const row = await queryOne<{ muallimah_id: string }>(
        `SELECT muallimah_id::text FROM public.muallimah_paid_classes WHERE id = $1 LIMIT 1`,
        [entityId]
      );
      if (!row) return ApiResponses.notFound('Kelas berbayar tidak ditemukan');
      ownerId = row.muallimah_id;
      paidClassId = entityId;
    } else if (entityType === 'paid_class_registration') {
      const row = await queryOne<{ user_id: string | null; paid_class_id: string; status: string | null }>(
        `SELECT user_id::text, paid_class_id::text, status FROM public.paid_class_registrations WHERE id = $1 LIMIT 1`,
        [entityId]
      );
      if (!row) return ApiResponses.notFound('Pendaftaran kelas berbayar tidak ditemukan');
      ownerId = row.user_id;
      paidClassId = row.paid_class_id;
      regStatus = row.status;
    }

    if (!isAdmin && ownerId !== auth.userId) {
      return ApiResponses.forbidden('Ukhti tidak berhak melihat riwayat edit ini');
    }

    const [history, editPhase] = await Promise.all([
      getRegistrationEditHistory(entityType, entityId),
      paidClassId
        ? resolvePaidClassEditPhase(paidClassId, regStatus)
        : resolveBatchEditPhase({
            userId: ownerId || auth.userId,
            batchId,
            isMuallimah: entityType === 'muallimah',
          }),
    ]);

    return ApiResponses.success({
      history,
      editPhase,
    });
  } catch (error: any) {
    console.error('[API /api/pendaftaran/edit-history GET] Error:', error);
    return ApiResponses.serverError(error?.message || 'Gagal memuat riwayat edit');
  }
}
