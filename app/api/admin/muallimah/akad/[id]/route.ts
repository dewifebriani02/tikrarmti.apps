import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import { getAuthorizationContext, isUserAdmin } from '@/lib/rbac';
import { query, transaction } from '@/lib/db';

// Columns the admin UI (MuallimahV2Tab / MuallimahEditModal) may change. Anything else is ignored.
const AKAD_FIELDS = [
  'status', 'review_notes', 'class_type', 'paid_class_scheme', 'preferred_juz',
  'preferred_max_thalibah', 'preferred_schedule', 'backup_schedule', 'batch_id',
  'exclude_from_capacity',
] as const;
const PROFILE_FIELDS = [
  'full_name', 'whatsapp', 'email', 'birth_place', 'birth_date', 'address', 'education',
  'occupation', 'timezone', 'health_condition', 'memorization_level', 'memorized_juz',
  'teaching_experience', 'teaching_years', 'teaching_institutions', 'motivation',
  'special_skills', 'tajweed_institution', 'quran_institution', 'teaching_communities',
  'memorized_tajweed_matan', 'studied_matan_exegesis', 'examined_juz', 'certified_juz',
] as const;
const USER_FIELDS = ['full_name', 'whatsapp'] as const;
const AKAD_STATUSES = ['pending', 'approved', 'rejected', 'waitlist'];

function pick(source: unknown, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!source || typeof source !== 'object') return out;
  for (const field of fields) {
    if (field in (source as Record<string, unknown>)) out[field] = (source as Record<string, unknown>)[field];
  }
  return out;
}

async function updateRow(client: PoolClient, table: string, id: string, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const result = await client.query(
    `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1}`,
    [...keys.map(k => data[k]), id]
  );
  return result.rowCount ?? 0;
}

async function requireAdminContext() {
  const context = await getAuthorizationContext();
  if (!context) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isUserAdmin(context)) {
    return { error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }) };
  }
  return { context };
}

/**
 * PATCH /api/admin/muallimah/akad/[id]
 * Body: { akad?: {...}, profile_id?: string, profile?: {...}, user?: { full_name, whatsapp } }
 * - akad    → muallimah_akads row [id]
 * - profile → muallimah_registrations row `profile_id`, only if it belongs to the akad's owner
 * - user    → users row of the akad's owner
 * All updates run in one transaction.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { context, error } = await requireAdminContext();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const akad = pick(body?.akad, AKAD_FIELDS);
    const profile = pick(body?.profile, PROFILE_FIELDS);
    const userUpdate = pick(body?.user, USER_FIELDS);

    if (akad.status !== undefined && !AKAD_STATUSES.includes(String(akad.status))) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    if ('birth_date' in profile && !profile.birth_date) profile.birth_date = null;

    if (!Object.keys(akad).length && !Object.keys(profile).length && !Object.keys(userUpdate).length) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    await transaction(async (client) => {
      const { rows } = await client.query<{ id: string; user_id: string; status: string }>(
        'SELECT id, user_id, status FROM muallimah_akads WHERE id = $1 FOR UPDATE',
        [params.id]
      );
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Akad tidak ditemukan'), { status: 404 });

      // The edit modal always sends the current status — only record a review when it changes
      if (akad.status !== undefined && akad.status !== current.status
          && (akad.status === 'approved' || akad.status === 'rejected')) {
        akad.reviewed_by = context!.userId;
        akad.reviewed_at = new Date().toISOString();
      }
      if (Object.keys(akad).length > 0) akad.updated_at = new Date().toISOString();

      await updateRow(client, 'muallimah_akads', current.id, akad);
      if (Object.keys(profile).length && typeof body?.profile_id === 'string') {
        const { rows: regRows } = await client.query(
          'SELECT id FROM muallimah_registrations WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [body.profile_id, current.user_id]
        );
        if (!regRows[0]) throw Object.assign(new Error('Profil tidak cocok dengan akad'), { status: 400 });
        await updateRow(client, 'muallimah_registrations', regRows[0].id, profile);
      }
      if (Object.keys(userUpdate).length) {
        await updateRow(client, 'users', current.user_id, { ...userUpdate, updated_at: new Date().toISOString() });
      }
    });

    return NextResponse.json({ success: true });
  } catch (caught) {
    const err = caught as { status?: number; code?: string; message?: string };
    if (err?.status === 400 || err?.status === 404) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err?.code === '23505') {
      return NextResponse.json(
        { error: 'Ustadzah ini sudah terdaftar di Batch yang dipilih (Duplikat). Silakan pilih Batch lain atau ubah status pendaftaran yang lama.' },
        { status: 409 }
      );
    }
    console.error('[PATCH admin/muallimah/akad] Error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui data akad' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/muallimah/akad/[id] — admin deletes a muallimah akad.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireAdminContext();
    if (error) return error;

    const { rowCount } = await query('DELETE FROM muallimah_akads WHERE id = $1', [params.id]);
    if (!rowCount) return NextResponse.json({ error: 'Akad tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE admin/muallimah/akad] Error:', err);
    return NextResponse.json({ error: 'Gagal menghapus akad' }, { status: 500 });
  }
}
