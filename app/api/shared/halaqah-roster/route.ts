import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    if (!batchId) {
      return NextResponse.json({ error: 'batch_id is required' }, { status: 400 });
    }

    const sql = `
      SELECT 
        h.id,
        h.name,
        h.day_of_week,
        h.start_time,
        h.end_time,
        h.preferred_juz,
        h.max_students,
        h.zoom_link,
        h.zoom_link_id,
        h.libur_date,
        h.muallimah_id,
        CASE WHEN bzl.id IS NOT NULL THEN
          json_build_object(
            'name', bzl.name,
            'url', bzl.url,
            'meeting_id', bzl.meeting_id,
            'passcode', bzl.passcode,
            'claim_host', bzl.claim_host
          )
        ELSE NULL END as zoom,
        CASE WHEN u.id IS NOT NULL THEN
          json_build_object(
            'full_name', u.full_name,
            'nama_kunyah', u.nama_kunyah,
            'whatsapp', u.whatsapp
          )
        ELSE NULL END as muallimah,
        CASE WHEN p.id IS NOT NULL THEN
          json_build_object(
            'class_type', p.class_type,
            'batch_id', p.batch_id,
            'batch', json_build_object('name', b.name)
          )
        ELSE NULL END as program,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'status', hs.status,
                'thalibah_id', hs.thalibah_id,
                'thalibah', json_build_object(
                  'full_name', tu.full_name,
                  'whatsapp', tu.whatsapp
                )
              )
            )
            FROM halaqah_students hs
            LEFT JOIN users tu ON tu.id = hs.thalibah_id
            WHERE hs.halaqah_id = h.id
          ),
          '[]'::json
        ) as students,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'role', hm.role,
                'user', json_build_object(
                  'full_name', mu.full_name,
                  'whatsapp', mu.whatsapp
                )
              )
            )
            FROM halaqah_mentors hm
            LEFT JOIN users mu ON mu.id = hm.mentor_id
            WHERE hm.halaqah_id = h.id
          ),
          '[]'::json
        ) as mentors
      FROM halaqah h
      LEFT JOIN programs p ON p.id = h.program_id
      LEFT JOIN batches b ON b.id = p.batch_id
      LEFT JOIN users u ON u.id = h.muallimah_id
      LEFT JOIN batch_zoom_links bzl ON bzl.id = h.zoom_link_id
      WHERE h.status = 'active'
        AND (p.batch_id = $1 OR b.id = $1)
      ORDER BY h.day_of_week ASC, h.start_time ASC;
    `;

    const { rows } = await query(sql, [batchId]);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Unexpected error fetching halaqah roster:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
