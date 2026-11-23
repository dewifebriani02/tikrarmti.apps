import { query, queryOne } from '@/lib/db';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';
import { waitBetweenWhatsAppMessages, classifyWhatsAppError } from '@/lib/utils/whatsapp-throttle';
import { formatMuallimahName } from '@/lib/roles';

export type RegistrationEntityType =
  | 'tikrar'
  | 'pra_tikrar'
  | 'muallimah'
  | 'musyrifah'
  | 'paid_class'
  | 'paid_class_registration';

export type EditPhase = 'before_daftar_ulang' | 'after_daftar_ulang';

export interface FieldDiffEntry {
  label: string;
  old: any;
  new: any;
}

export type FieldChangeDiff = Record<string, FieldDiffEntry>;

export interface EditNotificationSummary {
  channel: 'whatsapp';
  recipientsCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount?: number;
  summary?: string;
  details?: Array<{ name: string; success: boolean; error?: string }>;
}

export interface EditHistoryRecord {
  id: string;
  entity_type: RegistrationEntityType;
  entity_id: string;
  user_id: string;
  batch_id: string | null;
  edit_phase: EditPhase;
  changed_fields: FieldChangeDiff;
  edit_reason: string | null;
  notifications_sent: EditNotificationSummary | null;
  created_at: string;
}

export interface EditPhaseInfo {
  phase: EditPhase;
  hasDaftarUlang: boolean;
  isCutoffDatePassed: boolean;
  hasActiveStudents: boolean;
  cutoffReason: string;
}

let historyTableEnsured = false;

export async function ensureRegistrationEditHistoryTable(): Promise<void> {
  if (historyTableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.registration_edit_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL CHECK (
          entity_type IN (
            'tikrar',
            'pra_tikrar',
            'muallimah',
            'musyrifah',
            'paid_class',
            'paid_class_registration'
          )
        ),
        entity_id UUID NOT NULL,
        user_id UUID NOT NULL,
        batch_id UUID NULL,
        edit_phase TEXT NOT NULL CHECK (
          edit_phase IN ('before_daftar_ulang', 'after_daftar_ulang')
        ),
        changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
        edit_reason TEXT NULL,
        notifications_sent JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reg_edit_history_entity
        ON public.registration_edit_history (entity_type, entity_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_reg_edit_history_user
        ON public.registration_edit_history (user_id, created_at DESC);
    `);
    historyTableEnsured = true;
  } catch (err) {
    console.warn('[EditHistory] Failed ensuring table:', err);
  }
}

export function getTodayWibDateString(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function normalizeDateOnly(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  return s.slice(0, 10);
}

/**
 * Determines whether a batch-based registration is in Fase A (before_daftar_ulang)
 * or Fase B (after_daftar_ulang — daftar ulang / class already running).
 */
export async function resolveBatchEditPhase(params: {
  userId: string;
  batchId?: string | null;
  isMuallimah?: boolean;
}): Promise<EditPhaseInfo> {
  const { userId, batchId, isMuallimah } = params;
  const todayWib = getTodayWibDateString();

  let hasDaftarUlang = false;
  let isCutoffDatePassed = false;
  let hasActiveStudents = false;

  try {
    if (batchId) {
      const batch = await queryOne<{
        status: string | null;
        re_enrollment_date: string | null;
        opening_class_date: string | null;
        first_week_start_date: string | null;
      }>(
        `SELECT
          status,
          re_enrollment_date::text,
          opening_class_date::text,
          first_week_start_date::text
         FROM public.batches
         WHERE id = $1
         LIMIT 1`,
        [batchId]
      );

      if (batch) {
        const cutoffDates = [
          normalizeDateOnly(batch.re_enrollment_date),
          normalizeDateOnly(batch.opening_class_date),
          normalizeDateOnly(batch.first_week_start_date),
        ].filter(Boolean) as string[];

        if (cutoffDates.some((d) => todayWib >= d)) {
          isCutoffDatePassed = true;
        }
      }

      if (!isMuallimah) {
        const du = await queryOne<{ id: string }>(
          `SELECT id
           FROM public.daftar_ulang_submissions
           WHERE user_id = $1
             AND batch_id = $2
             AND COALESCE(status, 'draft') IN ('draft', 'submitted', 'approved')
           LIMIT 1`,
          [userId, batchId]
        );
        hasDaftarUlang = Boolean(du);
      } else {
        // For Mu'allimah: check if any of her halaqah in this batch already has enrolled/active students
        const studentRow = await queryOne<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt
           FROM public.halaqah h
           JOIN public.programs p ON p.id = h.program_id
           LEFT JOIN public.halaqah_students hs
             ON hs.halaqah_id = h.id AND COALESCE(hs.status, 'active') = 'active'
           LEFT JOIN public.daftar_ulang_submissions du
             ON (du.tashih_halaqah_id = h.id OR du.ujian_halaqah_id = h.id)
             AND COALESCE(du.status, 'draft') IN ('submitted', 'approved')
           WHERE h.muallimah_id = $1
             AND p.batch_id = $2
             AND (hs.id IS NOT NULL OR du.id IS NOT NULL)`,
          [userId, batchId]
        );
        hasActiveStudents = Number(studentRow?.cnt || 0) > 0;
      }
    }
  } catch (err) {
    console.warn('[EditHistory] Failed resolving batch edit phase:', err);
  }

  const isPhaseB = hasDaftarUlang || isCutoffDatePassed || hasActiveStudents;
  let cutoffReason = 'Belum masuk masa daftar ulang / kelas berjalan';
  if (hasActiveStudents) {
    cutoffReason = 'Sudah ada thalibah aktif di halaqah Ukhti';
  } else if (hasDaftarUlang) {
    cutoffReason = 'Ukhti sudah memasuki / mengisi tahap Daftar Ulang';
  } else if (isCutoffDatePassed) {
    cutoffReason = 'Jadwal batch sudah memasuki masa Daftar Ulang / Kelas Berjalan';
  }

  return {
    phase: isPhaseB ? 'after_daftar_ulang' : 'before_daftar_ulang',
    hasDaftarUlang,
    isCutoffDatePassed,
    hasActiveStudents,
    cutoffReason,
  };
}

/**
 * Determines edit phase for Paid Class (Mu'allimah or Thalibah registration).
 */
export async function resolvePaidClassEditPhase(
  paidClassId: string,
  registrationStatus?: string | null
): Promise<EditPhaseInfo> {
  const todayWib = getTodayWibDateString();
  let isCutoffDatePassed = false;
  let hasActiveStudents = false;
  let hasDaftarUlang = false;

  try {
    const cls = await queryOne<{
      status: string | null;
      start_date: string | null;
    }>(
      `SELECT status, start_date::text
       FROM public.muallimah_paid_classes
       WHERE id = $1
       LIMIT 1`,
      [paidClassId]
    );

    if (cls) {
      const startDate = normalizeDateOnly(cls.start_date);
      if (startDate && todayWib >= startDate) {
        isCutoffDatePassed = true;
      }
      if (cls.status === 'active') {
        isCutoffDatePassed = true;
      }
    }

    const countRow = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM public.paid_class_registrations
       WHERE paid_class_id = $1
         AND COALESCE(status, 'pending') NOT IN ('cancelled', 'rejected')`,
      [paidClassId]
    );
    hasActiveStudents = Number(countRow?.cnt || 0) > 0;

    if (registrationStatus && ['verified', 'approved', 'paid', 'active'].includes(registrationStatus)) {
      hasDaftarUlang = true;
    }
  } catch (err) {
    console.warn('[EditHistory] Failed resolving paid class edit phase:', err);
  }

  const isPhaseB = isCutoffDatePassed || hasActiveStudents || hasDaftarUlang;
  let cutoffReason = 'Kelas belum dimulai dan belum ada peserta aktif';
  if (isCutoffDatePassed) {
    cutoffReason = 'Kelas sudah memasuki tanggal mulai / berstatus aktif berjalan';
  } else if (hasActiveStudents) {
    cutoffReason = 'Sudah ada thalibah yang mendaftar di kelas ini';
  } else if (hasDaftarUlang) {
    cutoffReason = 'Pendaftaran sudah terverifikasi / berjalan';
  }

  return {
    phase: isPhaseB ? 'after_daftar_ulang' : 'before_daftar_ulang',
    hasDaftarUlang,
    isCutoffDatePassed,
    hasActiveStudents,
    cutoffReason,
  };
}

function normalizeComparable(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return JSON.stringify(val.map((v) => String(v).trim()).filter(Boolean));
  if (typeof val === 'object') {
    const sorted: Record<string, any> = {};
    for (const k of Object.keys(val).sort()) {
      sorted[k] = val[k];
    }
    return JSON.stringify(sorted);
  }
  const s = String(val).trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try {
      return normalizeComparable(JSON.parse(s));
    } catch {
      return s;
    }
  }
  return s;
}

export function formatScheduleJsonForDisplay(raw: any): string {
  if (!raw) return '-';
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const parts: string[] = [];
    if (obj?.tikrar?.day) {
      parts.push(
        `Tikrar: ${obj.tikrar.day} (${String(obj.tikrar.time_start || '').slice(0, 5)}–${String(obj.tikrar.time_end || '').slice(0, 5)})`
      );
    }
    if (obj?.pra_tahfidz?.day) {
      parts.push(
        `Pra-Tikrar: ${obj.pra_tahfidz.day} (${String(obj.pra_tahfidz.time_start || '').slice(0, 5)}–${String(obj.pra_tahfidz.time_end || '').slice(0, 5)})`
      );
    }
    if (parts.length > 0) return parts.join(' | ');
  } catch {
    // fallback
  }
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

function formatReadableValue(fieldKey: string, val: any): any {
  if (val === null || val === undefined || val === '') return null;
  if (fieldKey === 'preferred_schedule' || fieldKey === 'backup_schedule') {
    return formatScheduleJsonForDisplay(val);
  }
  if (Array.isArray(val)) return val.join(', ');
  return val;
}

export function computeFieldDiffs(
  oldRecord: Record<string, any>,
  newRecord: Record<string, any>,
  fieldLabels: Record<string, string>
): FieldChangeDiff {
  const diffs: FieldChangeDiff = {};
  for (const [key, label] of Object.entries(fieldLabels)) {
    const oldVal = oldRecord?.[key];
    const newVal = newRecord?.[key];
    if (normalizeComparable(oldVal) !== normalizeComparable(newVal)) {
      diffs[key] = {
        label,
        old: formatReadableValue(key, oldVal),
        new: formatReadableValue(key, newVal),
      };
    }
  }
  return diffs;
}

export async function recordRegistrationEdit(params: {
  entityType: RegistrationEntityType;
  entityId: string;
  userId: string;
  batchId?: string | null;
  editPhase: EditPhase;
  changedFields: FieldChangeDiff;
  editReason?: string | null;
  notificationsSent?: EditNotificationSummary | null;
  recordBeforeCutoffToo?: boolean;
}): Promise<EditHistoryRecord | null> {
  const hasChanges = Object.keys(params.changedFields || {}).length > 0;
  if (!hasChanges) return null;

  // Record history whenever we are in after_daftar_ulang OR if notifications were sent
  // (or explicitly requested).
  const shouldRecord =
    params.editPhase === 'after_daftar_ulang' ||
    Boolean(params.notificationsSent && params.notificationsSent.recipientsCount > 0) ||
    Boolean(params.recordBeforeCutoffToo);

  if (!shouldRecord) {
    return null;
  }

  await ensureRegistrationEditHistoryTable();

  const row = await queryOne<EditHistoryRecord>(
    `INSERT INTO public.registration_edit_history (
      entity_type,
      entity_id,
      user_id,
      batch_id,
      edit_phase,
      changed_fields,
      edit_reason,
      notifications_sent
    )
    VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6::jsonb, $7, $8::jsonb)
    RETURNING
      id::text,
      entity_type,
      entity_id::text,
      user_id::text,
      batch_id::text,
      edit_phase,
      changed_fields,
      edit_reason,
      notifications_sent,
      created_at::text`,
    [
      params.entityType,
      params.entityId,
      params.userId,
      params.batchId || null,
      params.editPhase,
      JSON.stringify(params.changedFields),
      params.editReason?.trim() || null,
      params.notificationsSent ? JSON.stringify(params.notificationsSent) : null,
    ]
  );

  return row;
}

export async function getRegistrationEditHistory(
  entityType: RegistrationEntityType,
  entityId: string
): Promise<EditHistoryRecord[]> {
  await ensureRegistrationEditHistoryTable();

  const { rows } = await query<EditHistoryRecord>(
    `SELECT
      id::text,
      entity_type,
      entity_id::text,
      user_id::text,
      batch_id::text,
      edit_phase,
      changed_fields,
      edit_reason,
      notifications_sent,
      created_at::text
     FROM public.registration_edit_history
     WHERE entity_type = $1 AND entity_id = $2::uuid
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );

  return rows;
}

function mapDayToNumber(dayStr?: string | null): number | null {
  if (!dayStr) return null;
  const d = dayStr.toLowerCase().trim();
  if (d.includes('senin')) return 1;
  if (d.includes('selasa')) return 2;
  if (d.includes('rabu')) return 3;
  if (d.includes('kamis')) return 4;
  if (d.includes('jumat') || d.includes("jum'at")) return 5;
  if (d.includes('sabtu')) return 6;
  if (d.includes('ahad') || d.includes('minggu')) return 7;
  return null;
}

function parseScheduleObj(raw: any): Record<string, { day?: string; time_start?: string; time_end?: string }> {
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

function formatSingleSlot(slot?: { day?: string; time_start?: string; time_end?: string } | null): string {
  if (!slot?.day) return '-';
  const start = String(slot.time_start || '').slice(0, 5);
  const end = String(slot.time_end || '').slice(0, 5);
  return start && end ? `${slot.day}, ${start}–${end} WIB` : slot.day;
}

/**
 * Syncs Mu'allimah regular schedule edits to matching `halaqah` records and
 * automatically sends WhatsApp notifications to active Thalibah in those halaqah.
 */
export async function syncMuallimahHalaqahAndNotifyThalibah(params: {
  muallimahUserId: string;
  muallimahName: string;
  batchId: string;
  oldPreferredSchedule: any;
  newPreferredSchedule: any;
  editReason?: string | null;
}): Promise<EditNotificationSummary | null> {
  const oldSched = parseScheduleObj(params.oldPreferredSchedule);
  const newSched = parseScheduleObj(params.newPreferredSchedule);

  const changedClasses: Array<{
    key: 'tikrar' | 'pra_tahfidz';
    oldSlot: { day?: string; time_start?: string; time_end?: string } | undefined;
    newSlot: { day?: string; time_start?: string; time_end?: string } | undefined;
  }> = [];

  for (const key of ['tikrar', 'pra_tahfidz'] as const) {
    const o = oldSched?.[key];
    const n = newSched?.[key];
    if (n?.day && n?.time_start && n?.time_end) {
      if (
        normalizeComparable(o?.day) !== normalizeComparable(n.day) ||
        normalizeComparable(String(o?.time_start || '').slice(0, 5)) !== normalizeComparable(String(n.time_start).slice(0, 5)) ||
        normalizeComparable(String(o?.time_end || '').slice(0, 5)) !== normalizeComparable(String(n.time_end).slice(0, 5))
      ) {
        changedClasses.push({ key, oldSlot: o, newSlot: n });
      }
    }
  }

  if (changedClasses.length === 0) {
    return null;
  }

  // Find halaqah rows for this muallimah in this batch
  const { rows: halaqahs } = await query<{
    id: string;
    name: string;
    program_class_type: string | null;
    program_name: string | null;
  }>(
    `SELECT
      h.id::text AS id,
      h.name,
      p.class_type AS program_class_type,
      p.name AS program_name
     FROM public.halaqah h
     JOIN public.programs p ON p.id = h.program_id
     WHERE h.muallimah_id = $1
       AND p.batch_id = $2
       AND COALESCE(h.status, 'active') != 'inactive'`,
    [params.muallimahUserId, params.batchId]
  );

  if (halaqahs.length === 0) {
    return null;
  }

  const ustadzahFormatted = formatMuallimahName(params.muallimahName) || 'Ustadzah MTI';
  const affectedHalaqahNotifications: Array<{
    halaqahId: string;
    halaqahName: string;
    oldText: string;
    newText: string;
  }> = [];

  for (const ch of changedClasses) {
    const matchingHalaqahs = halaqahs.filter((h) => {
      const ct = (h.program_class_type || '').toLowerCase();
      const pn = (h.program_name || '').toLowerCase();
      if (ch.key === 'pra_tahfidz') {
        return ct === 'pra_tahfidz' || pn.includes('pra');
      }
      return ct === 'tikrar_tahfidz' || (!ct && !pn.includes('pra'));
    });

    const dayNum = mapDayToNumber(ch.newSlot?.day);
    for (const h of matchingHalaqahs) {
      await query(
        `UPDATE public.halaqah
         SET day_of_week = COALESCE($1, day_of_week),
             start_time = $2,
             end_time = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [dayNum, ch.newSlot!.time_start, ch.newSlot!.time_end, h.id]
      );

      affectedHalaqahNotifications.push({
        halaqahId: h.id,
        halaqahName: h.name,
        oldText: formatSingleSlot(ch.oldSlot),
        newText: formatSingleSlot(ch.newSlot),
      });
    }
  }

  if (affectedHalaqahNotifications.length === 0) {
    return null;
  }

  const affectedIds = affectedHalaqahNotifications.map((a) => a.halaqahId);

  // Gather active Thalibah in affected halaqah (from both halaqah_students and daftar_ulang_submissions)
  const { rows: studentRows } = await query<{
    user_id: string;
    full_name: string;
    whatsapp: string | null;
    halaqah_id: string;
  }>(
    `SELECT DISTINCT ON (u.id)
      u.id::text AS user_id,
      COALESCE(NULLIF(TRIM(u.full_name), ''), 'Thalibah') AS full_name,
      u.whatsapp,
      src.halaqah_id::text AS halaqah_id
     FROM (
       SELECT hs.thalibah_id AS user_id, hs.halaqah_id
       FROM public.halaqah_students hs
       WHERE hs.halaqah_id = ANY($1::uuid[])
         AND COALESCE(hs.status, 'active') = 'active'
       UNION ALL
       SELECT du.user_id, COALESCE(du.tashih_halaqah_id, du.ujian_halaqah_id) AS halaqah_id
       FROM public.daftar_ulang_submissions du
       WHERE (du.tashih_halaqah_id = ANY($1::uuid[]) OR du.ujian_halaqah_id = ANY($1::uuid[]))
         AND COALESCE(du.status, 'draft') IN ('submitted', 'approved')
     ) src
     JOIN public.users u ON u.id = src.user_id
     WHERE u.is_blacklisted IS NOT TRUE
       AND u.is_active IS NOT FALSE`,
    [affectedIds]
  );

  if (studentRows.length === 0) {
    return {
      channel: 'whatsapp',
      recipientsCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      summary: 'Jadwal halaqah tersinkronisasi (belum ada thalibah aktif)',
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const details: Array<{ name: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < studentRows.length; i++) {
    const st = studentRows[i];
    const phone = normalizePhoneNumber(st.whatsapp || '');
    if (!phone) {
      skippedCount++;
      details.push({ name: st.full_name, success: false, error: 'Nomor WA kosong/tidak valid' });
      continue;
    }

    const hInfo =
      affectedHalaqahNotifications.find((a) => a.halaqahId === st.halaqah_id) ||
      affectedHalaqahNotifications[0];

    const reasonLine = params.editReason?.trim()
      ? `\n• Catatan Perubahan: ${params.editReason.trim()}`
      : '';

    const message =
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `Ykh. Ukhti *${st.full_name}*,\n\n` +
      `Kami menginformasikan adanya *perubahan jadwal Halaqah* yang Ukhti ikuti bersama *${ustadzahFormatted}*:\n\n` +
      `📌 *Rincian Perubahan Jadwal (${hInfo.halaqahName}):*\n` +
      `• Jadwal Sebelumnya: ${hInfo.oldText}\n` +
      `• Jadwal Terbaru: *${hInfo.newText}*${reasonLine}\n\n` +
      `Mohon menyesuaikan waktu kehadiran Ukhti sesuai jadwal terbaru di atas. Detail halaqah juga dapat dilihat di:\n` +
      `🔗 https://markaztikrar.id/halaqah\n\n` +
      `*(Pesan otomatis dari Sistem Markaz Tikrar Indonesia).*\n\n` +
      `Jazakillahu khairan.\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n` +
      `━━━━━━━━━━━━━━\n` +
      `Tim Akademik Markaz Tikrar Indonesia\n` +
      `🌐 https://markaztikrar.id`;

    try {
      const res = await whatsappService.sendTextMessage(phone, message, { sourceTag: 'pendaftaran_notif' });
      if (res.success) {
        sentCount++;
        details.push({ name: st.full_name, success: true });
      } else {
        failedCount++;
        details.push({ name: st.full_name, success: false, error: res.error });
        const errClass = classifyWhatsAppError(res.error, {
          rateLimited: res.rateLimited,
          fatalInstanceError: res.fatalInstanceError,
        });
        if (errClass.shouldStopBatch) {
          break;
        }
      }
    } catch (err: any) {
      failedCount++;
      details.push({ name: st.full_name, success: false, error: err?.message });
    }

    if (i < studentRows.length - 1) {
      await waitBetweenWhatsAppMessages(i, studentRows.length);
    }
  }

  return {
    channel: 'whatsapp',
    recipientsCount: studentRows.length,
    sentCount,
    failedCount,
    skippedCount,
    summary: `Jadwal halaqah disinkronkan & WA dikirim ke ${sentCount}/${studentRows.length} thalibah`,
    details,
  };
}

/**
 * Automatically sends WhatsApp notifications to enrolled Thalibah when a Mu'allimah
 * updates schedule/start date/Zoom/WA link of her Paid Class.
 */
export async function notifyPaidClassThalibahOnScheduleChange(params: {
  paidClassId: string;
  className: string;
  ustadzahName: string;
  changedFields: FieldChangeDiff;
  editReason?: string | null;
}): Promise<EditNotificationSummary | null> {
  const scheduleKeys = [
    'schedule_day',
    'time_start',
    'time_end',
    'timezone',
    'start_date',
    'estimated_end_date',
    'zoom_link',
    'whatsapp_group_link',
  ];

  const relevantChanges = scheduleKeys
    .filter((k) => Boolean(params.changedFields[k]))
    .map((k) => params.changedFields[k]);

  if (relevantChanges.length === 0) {
    return null;
  }

  // If start_date changed, reset H-1 reminder flags so reminders trigger cleanly on the new date
  if (params.changedFields.start_date) {
    try {
      await query(
        `UPDATE public.muallimah_paid_classes SET reminder_h1_ustadzah_sent_at = NULL WHERE id = $1`,
        [params.paidClassId]
      );
      await query(
        `UPDATE public.paid_class_registrations SET reminder_h1_sent_at = NULL WHERE paid_class_id = $1`,
        [params.paidClassId]
      );
    } catch (err) {
      console.warn('[EditHistory] Failed resetting paid class H-1 flags:', err);
    }
  }

  const { rows: students } = await query<{
    registration_id: string;
    full_name: string;
    whatsapp: string | null;
  }>(
    `SELECT
      r.id::text AS registration_id,
      r.full_name,
      COALESCE(NULLIF(TRIM(r.whatsapp), ''), NULLIF(TRIM(u.whatsapp), '')) AS whatsapp
     FROM public.paid_class_registrations r
     LEFT JOIN public.users u ON u.id = r.user_id
     WHERE r.paid_class_id = $1
       AND COALESCE(r.status, 'pending') NOT IN ('cancelled', 'rejected')
       AND (u.id IS NULL OR (u.is_blacklisted IS NOT TRUE AND u.is_active IS NOT FALSE))
     ORDER BY r.created_at ASC`,
    [params.paidClassId]
  );

  if (students.length === 0) {
    return null;
  }

  const ustadzahFormatted = formatMuallimahName(params.ustadzahName) || 'Ustadzah MTI';
  const changeLines = relevantChanges
    .map((ch) => `• *${ch.label}*: ${ch.old ?? '-'} → *${ch.new ?? '-'}*`)
    .join('\n');
  const reasonLine = params.editReason?.trim()
    ? `\n• Catatan Perubahan: ${params.editReason.trim()}`
    : '';

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const details: Array<{ name: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    const phone = normalizePhoneNumber(st.whatsapp || '');
    if (!phone) {
      skippedCount++;
      details.push({ name: st.full_name, success: false, error: 'Nomor WA kosong/tidak valid' });
      continue;
    }

    const message =
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `Ykh. Ukhti *${st.full_name}*,\n\n` +
      `Kami menginformasikan adanya *pembaruan jadwal / informasi Kelas Berbayar* yang Ukhti ikuti:\n\n` +
      `📌 *${params.className}*\n` +
      `• Pengampu: *${ustadzahFormatted}*\n` +
      `${changeLines}${reasonLine}\n\n` +
      `Detail kelas terbaru dapat dilihat di portal MTI:\n` +
      `🔗 https://markaztikrar.id/pendaftaran/kelas-berbayar\n\n` +
      `*(Pesan otomatis dari Sistem Markaz Tikrar Indonesia).*\n\n` +
      `Jazakillahu khairan.\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n` +
      `━━━━━━━━━━━━━━\n` +
      `Tim Akademik Markaz Tikrar Indonesia\n` +
      `🌐 https://markaztikrar.id`;

    try {
      const res = await whatsappService.sendTextMessage(phone, message, { sourceTag: 'pendaftaran_notif' });
      if (res.success) {
        sentCount++;
        details.push({ name: st.full_name, success: true });
      } else {
        failedCount++;
        details.push({ name: st.full_name, success: false, error: res.error });
        const errClass = classifyWhatsAppError(res.error, {
          rateLimited: res.rateLimited,
          fatalInstanceError: res.fatalInstanceError,
        });
        if (errClass.shouldStopBatch) {
          break;
        }
      }
    } catch (err: any) {
      failedCount++;
      details.push({ name: st.full_name, success: false, error: err?.message });
    }

    if (i < students.length - 1) {
      await waitBetweenWhatsAppMessages(i, students.length);
    }
  }

  return {
    channel: 'whatsapp',
    recipientsCount: students.length,
    sentCount,
    failedCount,
    skippedCount,
    summary: `Notifikasi WhatsApp otomatis dikirim ke ${sentCount}/${students.length} thalibah`,
    details,
  };
}
