import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { musyrifahSchema } from '@/lib/schemas/musyrifah-registration';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/pendaftaran/musyrifah
 * Submit a musyrifah registration for the logged-in user. user_id and status are
 * always set by the server.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Data pendaftaran tidak valid' }, { status: 400 });
    }

    const batchId = body.batch_id;
    if (typeof batchId !== 'string' || !UUID_RE.test(batchId)) {
      return NextResponse.json({ success: false, error: 'Batch tidak valid' }, { status: 400 });
    }

    let data: z.infer<typeof musyrifahSchema>;
    try {
      data = musyrifahSchema.parse(body);
    } catch (error) {
      const message = error instanceof z.ZodError ? error.issues[0]?.message : undefined;
      return NextResponse.json({ success: false, error: message || 'Data pendaftaran tidak valid' }, { status: 400 });
    }

    const batch = await queryOne<{ id: string }>('SELECT id FROM batches WHERE id = $1', [batchId]);
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch tidak ditemukan' }, { status: 404 });
    }

    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM musyrifah_registrations WHERE user_id = $1 AND batch_id = $2 LIMIT 1',
      [user.id, batchId]
    );
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ukhti sudah mengirim pendaftaran Musyrifah untuk batch ini.' },
        { status: 409 }
      );
    }

    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO musyrifah_registrations (
         user_id, batch_id, full_name, birth_date, birth_place, address, whatsapp, email,
         education, occupation, leadership_experience, leadership_years, leadership_roles,
         management_skills, team_management_experience, preferred_schedule, backup_schedule,
         timezone, motivation, leadership_philosophy, special_achievements, status, submitted_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'pending', NOW())
       RETURNING id`,
      [
        user.id, batchId, data.full_name, data.birth_date, data.birth_place, data.address, data.whatsapp, data.email,
        data.education, data.occupation, data.leadership_experience, data.leadership_years || null, data.leadership_roles || null,
        data.management_skills, data.team_management_experience, data.preferred_schedule, data.backup_schedule,
        data.timezone, data.motivation || null, data.leadership_philosophy || null, data.special_achievements || null,
      ]
    );

    return NextResponse.json({ success: true, data: { id: inserted?.id } });
  } catch (error) {
    console.error('[POST /api/pendaftaran/musyrifah] Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengirim pendaftaran' }, { status: 500 });
  }
}
