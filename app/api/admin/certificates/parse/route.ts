import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationContext, hasAnyRole } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { query } from '@/lib/db';
import { extractPagesFromPdf, matchStudentToText, StudentCandidate } from '@/lib/certificates/pdf-stamper';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthorizationContext();
    if (!authContext) {
      return ApiResponses.unauthorized('Authentication required');
    }

    const allowedRoles = ['admin', 'superadmin', 'musyrifah'] as any[];
    if (!hasAnyRole(authContext, allowedRoles)) {
      return ApiResponses.forbidden('Hanya Admin dan Musyrifah yang dapat mengimpor sertifikat.');
    }

    const formData = await request.formData();
    const batchId = formData.get('batch_id') as string;
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return ApiResponses.badRequest('Tidak ada file PDF yang diunggah.');
    }

    // 1. Fetch students for the target batch & all students as candidates
    let studentsQuery = `
      SELECT id, full_name, student_id_number, email, current_juz
      FROM users
      WHERE roles && ARRAY['thalibah', 'calon_thalibah', 'raisah']::varchar[]
    `;
    const params: any[] = [];

    if (batchId && batchId !== 'all') {
      studentsQuery += ` AND (current_tikrar_batch_id = $1 OR id IN (SELECT user_id FROM daftar_ulang_submissions WHERE batch_id = $1))`;
      params.push(batchId);
    }

    studentsQuery += ` ORDER BY full_name ASC;`;

    const { rows: students } = await query<StudentCandidate>(studentsQuery, params);

    // Also fetch all students if batch-specific yielded few, to ensure we can match any thalibah
    let allCandidates = students;
    if (students.length === 0) {
      const { rows: fallbackStudents } = await query<StudentCandidate>(`
        SELECT id, full_name, student_id_number, email, current_juz
        FROM users
        ORDER BY full_name ASC;
      `);
      allCandidates = fallbackStudents;
    }

    // 2. Prepare temporary session storage directory
    const sessionId = crypto.randomUUID();
    const tempDir = path.join('/tmp', 'mti_cert_sessions', sessionId);
    await fs.mkdir(tempDir, { recursive: true });

    const results: any[] = [];

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      if (!file.name.toLowerCase().endsWith('.pdf')) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeFilename = `file_${fIdx}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const tempFilePath = path.join(tempDir, safeFilename);
      await fs.writeFile(tempFilePath, buffer);

      // Extract text per page
      const pages = await extractPagesFromPdf(buffer);

      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        const { pageNumber, text } = pages[pIdx];
        const matchResult = matchStudentToText(text, file.name, allCandidates);

        results.push({
          id: `${sessionId}_${fIdx}_${pIdx}`,
          sessionId,
          fileIndex: fIdx,
          fileName: file.name,
          tempFileName: safeFilename,
          pageIndex: pIdx,
          pageNumber,
          textSnippet: text.slice(0, 180),
          detectedJuz: matchResult.detectedJuz,
          matchedUserId: matchResult.matchedStudent?.id || null,
          matchedUserName: matchResult.matchedStudent?.full_name || null,
          matchedNit: matchResult.matchedStudent?.student_id_number || null,
          confidence: matchResult.confidence,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      totalItems: results.length,
      availableStudents: allCandidates.map(s => ({
        id: s.id,
        full_name: s.full_name,
        student_id_number: s.student_id_number,
        current_juz: s.current_juz
      })),
      items: results
    });
  } catch (error: any) {
    console.error('[CERTIFICATE PARSE API ERROR]', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
