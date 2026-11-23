import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext, hasAnyRole } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { getPool } from '@/lib/db';
import {
  detectDuplicates,
  resolveDuplicates,
} from '@/scripts/deduplicate-exam-questions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/exams/deduplicate
 * Scan and return duplicate exam questions across Juz and Packages.
 * Filters only active questions (is_active = true) by default.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Authentication required');
    }

    const allowedRoles = ['admin', 'superadmin', 'musyrifah'] as any[];
    if (!hasAnyRole(authContext, allowedRoles)) {
      return ApiResponses.forbidden('Hanya Admin dan Musyrifah yang berwenang memeriksa duplikasi soal.');
    }

    const { searchParams } = new URL(request.url);
    const juzParam = searchParams.get('juz');
    const useAi = searchParams.get('use_ai') === 'true';
    const activeOnly = searchParams.get('active_only') !== 'false'; // default true: hanya soal aktif
    const juz = juzParam && juzParam !== 'all' ? parseInt(juzParam, 10) : undefined;

    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await detectDuplicates(client, { juz, useAi, activeOnly });
      return NextResponse.json({
        success: true,
        data: result,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[EXAM DEDUPLICATE GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exams/deduplicate
 * Execute deduplication (archive or delete) with automatic exam_attempts re-mapping.
 * Only targets active questions by default.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Authentication required');
    }

    const allowedRoles = ['admin', 'superadmin'] as any[];
    if (!hasAnyRole(authContext, allowedRoles)) {
      return ApiResponses.forbidden('Hanya Admin yang berwenang mengeksekusi penghapusan duplikasi soal.');
    }

    const body = await request.json();
    const { action = 'delete', juz, useAi = false, activeOnly = true } = body; // action: 'delete' | 'archive'

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { groups } = await detectDuplicates(client, {
        juz: juz ? parseInt(juz, 10) : undefined,
        useAi,
        activeOnly: activeOnly !== false,
      });

      if (groups.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: true,
          message: 'Tidak ada duplikasi soal yang perlu diproses.',
          resolvedCount: 0,
          remappedAttempts: 0,
        });
      }

      const { resolvedCount, remappedAttempts } = await resolveDuplicates(
        client,
        groups,
        action === 'archive' ? 'archive' : 'delete'
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Berhasil membersihkan ${resolvedCount} soal duplikat (${action === 'archive' ? 'diarsipkan' : 'dihapus'}) dan menyinkronkan ${remappedAttempts} riwayat jawaban siswa.`,
        resolvedCount,
        remappedAttempts,
      });
    } catch (dbErr: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[EXAM DEDUPLICATE POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
