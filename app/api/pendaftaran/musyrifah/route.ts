import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { formatProperName } from '@/lib/utils/proper-name';
import { musyrifahSchema } from '@/lib/schemas/musyrifah-registration';
import {
  computeFieldDiffs,
  getRegistrationEditHistory,
  recordRegistrationEdit,
  resolveBatchEditPhase,
} from '@/lib/pendaftaran/edit-history';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MUSYRIFAH_FIELD_LABELS: Record<string, string> = {
  full_name: 'Nama Lengkap',
  birth_date: 'Tanggal Lahir',
  birth_place: 'Tempat Lahir',
  address: 'Alamat',
  whatsapp: 'No. WhatsApp',
  email: 'Email',
  education: 'Pendidikan Terakhir',
  occupation: 'Pekerjaan',
  leadership_experience: 'Pengalaman Kepemimpinan',
  leadership_years: 'Lama Pengalaman Kepemimpinan',
  leadership_roles: 'Peran Kepemimpinan',
  management_skills: 'Skill Manajemen',
  team_management_experience: 'Pengalaman Manajemen Tim',
  preferred_schedule: 'Jadwal Pilihan Utama',
  backup_schedule: 'Jadwal Pilihan Cadangan',
  timezone: 'Zona Waktu',
  motivation: 'Motivasi',
  leadership_philosophy: 'Filosofi Kepemimpinan',
  special_achievements: 'Prestasi Khusus',
};

/**
 * GET /api/pendaftaran/musyrifah?batch_id=...
 * Fetch the logged-in user's musyrifah registration, edit phase, and edit history.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    const reg = batchId && UUID_RE.test(batchId)
      ? await queryOne<any>(
          `SELECT * FROM public.musyrifah_registrations WHERE user_id = $1 AND batch_id = $2 LIMIT 1`,
          [user.id, batchId]
        )
      : await queryOne<any>(
          `SELECT * FROM public.musyrifah_registrations WHERE user_id = $1 ORDER BY submitted_at DESC NULLS LAST LIMIT 1`,
          [user.id]
        );

    const targetBatchId = (batchId && UUID_RE.test(batchId) ? batchId : null) || reg?.batch_id || null;
    const [editPhase, history] = await Promise.all([
      resolveBatchEditPhase({
        userId: user.id,
        batchId: targetBatchId,
      }),
      reg?.id ? getRegistrationEditHistory('musyrifah', reg.id) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        registration: reg || null,
        editPhase,
        history,
      },
    });
  } catch (error) {
    console.error('[GET /api/pendaftaran/musyrifah] Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data pendaftaran Musyrifah' }, { status: 500 });
  }
}

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
        { success: false, error: 'Ukhti sudah mengirim pendaftaran Musyrifah untuk batch ini. Gunakan mode edit untuk memperbarui.' },
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
        user.id, batchId, formatProperName(data.full_name), data.birth_date, data.birth_place, data.address, data.whatsapp, data.email,
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

/**
 * PATCH /api/pendaftaran/musyrifah
 * Update existing musyrifah registration for the logged-in user and record post-cutoff history.
 */
export async function PATCH(request: NextRequest) {
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
    const registrationId = body.registration_id;
    const editReason = typeof body.editReason === 'string' ? body.editReason : undefined;

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

    const existing = registrationId && UUID_RE.test(registrationId)
      ? await queryOne<any>(
          'SELECT * FROM musyrifah_registrations WHERE id = $1 AND user_id = $2 LIMIT 1',
          [registrationId, user.id]
        )
      : await queryOne<any>(
          'SELECT * FROM musyrifah_registrations WHERE user_id = $1 AND batch_id = $2 LIMIT 1',
          [user.id, batchId]
        );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftaran Musyrifah tidak ditemukan' },
        { status: 404 }
      );
    }

    const updated = await queryOne<any>(
      `UPDATE musyrifah_registrations
       SET full_name = $1,
           birth_date = $2,
           birth_place = $3,
           address = $4,
           whatsapp = $5,
           email = $6,
           education = $7,
           occupation = $8,
           leadership_experience = $9,
           leadership_years = $10,
           leadership_roles = $11,
           management_skills = $12,
           team_management_experience = $13,
           preferred_schedule = $14,
           backup_schedule = $15,
           timezone = $16,
           motivation = $17,
           leadership_philosophy = $18,
           special_achievements = $19
       WHERE id = $20 AND user_id = $21
       RETURNING *`,
      [
        formatProperName(data.full_name),
        data.birth_date,
        data.birth_place,
        data.address,
        data.whatsapp,
        data.email,
        data.education,
        data.occupation,
        data.leadership_experience,
        data.leadership_years || null,
        data.leadership_roles || null,
        data.management_skills,
        data.team_management_experience,
        data.preferred_schedule,
        data.backup_schedule,
        data.timezone,
        data.motivation || null,
        data.leadership_philosophy || null,
        data.special_achievements || null,
        existing.id,
        user.id,
      ]
    );

    const phaseInfo = await resolveBatchEditPhase({
      userId: user.id,
      batchId,
    });

    const diffs = computeFieldDiffs(existing, updated || data, MUSYRIFAH_FIELD_LABELS);
    const historyRow = await recordRegistrationEdit({
      entityType: 'musyrifah',
      entityId: existing.id,
      userId: user.id,
      batchId,
      editPhase: phaseInfo.phase,
      changedFields: diffs,
      editReason,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: existing.id,
        registration: updated,
        editPhase: phaseInfo.phase,
        historyRecorded: Boolean(historyRow),
      },
      message: historyRow
        ? 'Alhamdulillah! Perubahan data Musyrifah berhasil disimpan & tercatat di Riwayat Edit.'
        : 'Alhamdulillah! Data pendaftaran Musyrifah berhasil diperbarui.',
    });
  } catch (error) {
    console.error('[PATCH /api/pendaftaran/musyrifah] Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui pendaftaran Musyrifah' }, { status: 500 });
  }
}
