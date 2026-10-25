import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext, hasAnyRole } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Authentication required');
    }

    const allowedRoles = ['admin', 'superadmin', 'musyrifah'] as any[];
    if (!hasAnyRole(authContext, allowedRoles)) {
      return ApiResponses.forbidden('Hanya Admin dan Musyrifah yang dapat mengakses data sertifikat.');
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        c.id,
        c.certificate_number,
        c.user_id,
        c.batch_id,
        c.juz_number,
        c.predicate,
        c.issue_date,
        c.hijri_date,
        c.pdf_url,
        c.qr_code_url,
        c.status,
        c.metadata,
        c.created_at,
        c.updated_at,
        u.full_name as student_name,
        u.student_id_number as student_nit,
        u.email as student_email,
        b.name as batch_name
      FROM certificates c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN batches b ON c.batch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (batchId && batchId !== 'all') {
      sql += ` AND c.batch_id = $${pIdx++}`;
      params.push(batchId);
    }

    if (search && search.trim()) {
      sql += ` AND (
        c.certificate_number ILIKE $${pIdx} OR 
        u.full_name ILIKE $${pIdx} OR 
        u.student_id_number ILIKE $${pIdx}
      )`;
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    // Count total query
    const countSql = `SELECT COUNT(*)::int as total FROM (${sql}) AS filtered_certs`;
    const { rows: countRows } = await query(countSql, params);
    const total = countRows[0]?.total || 0;

    sql += ` ORDER BY c.created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    params.push(limit, offset);

    const { rows: certificates } = await query(sql, params);

    return NextResponse.json({
      success: true,
      certificates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('[ADMIN CERTIFICATES GET ERROR]', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Authentication required');
    }

    const allowedRoles = ['admin', 'superadmin'] as any[];
    if (!hasAnyRole(authContext, allowedRoles)) {
      return ApiResponses.forbidden('Hanya Admin yang dapat menghapus atau mencabut sertifikat.');
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiResponses.badRequest('ID sertifikat diperlukan.');
    }

    // Find certificate
    const { rows: certRows } = await query('SELECT * FROM certificates WHERE id = $1', [id]);
    if (certRows.length === 0) {
      return ApiResponses.notFound('Sertifikat tidak ditemukan.');
    }

    const cert = certRows[0];

    // Try deleting PDF file from disk
    if (cert.pdf_url && cert.pdf_url.startsWith('/uploads/certificates/')) {
      try {
        const filePath = path.join(process.cwd(), 'public', cert.pdf_url);
        await fs.unlink(filePath);
      } catch (e) {
        console.warn('Could not remove file on disk:', e);
      }
    }

    // Delete record from DB
    await query('DELETE FROM certificates WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: `Sertifikat ${cert.certificate_number} berhasil dihapus.`
    });
  } catch (error: any) {
    console.error('[ADMIN CERTIFICATES DELETE ERROR]', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
