import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAnyRole } from '@/lib/rbac';

export async function GET() {
  try {
    const authError = await requireAnyRole(['admin', 'musyrifah']);
    if (authError) return authError;

    const sql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.whatsapp,
        dus.status as submission_status,
        json_build_object('id', h.id, 'name', h.name) as halaqah,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ptt.id,
                'batch_id', ptt.batch_id,
                'status', ptt.status,
                'selection_status', ptt.selection_status,
                'batch', json_build_object('name', b.name)
              )
            )
            FROM pendaftaran_tikrar_tahfidz ptt
            LEFT JOIN batches b ON b.id = ptt.batch_id
            WHERE ptt.user_id = u.id
          ),
          '[]'::json
        ) as tikrar_registrations
      FROM daftar_ulang_submissions dus
      JOIN users u ON u.id = dus.user_id
      LEFT JOIN halaqah_students hs ON hs.user_id = u.id
      LEFT JOIN halaqah h ON h.id = hs.halaqah_id
      WHERE dus.status IN ('approved', 'submitted')
      ORDER BY dus.created_at DESC
    `;

    const result = await query(sql);

    const transformedData = result.rows.map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      whatsapp: row.whatsapp,
      submission_status: row.submission_status,
      halaqah: row.halaqah?.id ? row.halaqah : null,
      tikrar_registrations: row.tikrar_registrations || [],
    }));

    return NextResponse.json({ success: true, data: transformedData });
  } catch (error: any) {
    console.error('Error in musyrifah thalibah API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

