import { query } from '@/lib/db';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';
import { formatMuallimahName } from '@/lib/roles';

export interface ExamReminderCandidate {
  registrationId: string;
  userId: string;
  scheduleId: string;
  fullName: string;
  whatsapp: string;
  batchName?: string;
  examDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string;
  examinerName: string;
  targetJuz: string;
  locationLink: string;
  scheduleNotes?: string;
  alreadySent: boolean;
  reminderSentAt?: string | null;
}

export interface ExaminerThalibahItem {
  registrationId: string;
  userId: string;
  fullName: string;
  targetJuz: string;
  whatsapp?: string;
}

export interface ExaminerSessionItem {
  scheduleId: string;
  batchName?: string;
  startTime: string;
  endTime: string;
  timeRangeFormatted: string;
  locationLink: string;
  notes?: string;
  alreadySent: boolean;
  reminderSentAt?: string | null;
  students: ExaminerThalibahItem[];
}

export interface ExaminerReminderCandidate {
  examinerId: string;
  examinerName: string;
  whatsapp: string;
  examDate: string;
  examDateFormatted: string;
  sessions: ExaminerSessionItem[];
  totalStudents: number;
  scheduleIds: string[];
  alreadySent: boolean;
  reminderSentAt?: string | null;
}

export interface SendH1ExamRemindersOptions {
  targetDate?: string; // YYYY-MM-DD (Defaults to tomorrow in Asia/Jakarta)
  dryRun?: boolean;
  force?: boolean;
}

export interface SendH1ExamRemindersResult {
  success: boolean;
  targetDate: string;
  dryRun: boolean;
  totalCandidates: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  results: {
    registrationId: string;
    fullName: string;
    whatsapp: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

export interface SendH1ExaminerRemindersResult {
  success: boolean;
  targetDate: string;
  dryRun: boolean;
  totalExaminers: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  results: {
    examinerId: string;
    examinerName: string;
    whatsapp: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

/**
 * Returns tomorrow's date string in YYYY-MM-DD based on Asia/Jakarta timezone (WIB)
 */
export function getTomorrowWibDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
  
  // Advance 1 day in UTC
  const tomorrow = new Date(Date.UTC(year, month, day + 1));
  return tomorrow.toISOString().slice(0, 10);
}

/**
 * Formats YYYY-MM-DD into Indonesian localized date (e.g. "Senin, 02 November 2026")
 */
export function formatIndonesianDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

/**
 * Formats time range (e.g. "16:00 – 17:00 WIB")
 */
export function formatTimeRange(start: string, end: string): string {
  const s = (start || '').slice(0, 5);
  const e = (end || '').slice(0, 5);
  return `${s} – ${e} WIB`;
}

/**
 * Builds the official MTI WhatsApp Reminder message text for Thalibah (student)
 */
export function buildH1OralExamMessage(recipient: {
  fullName: string;
  batchName?: string;
  examDateFormatted: string;
  timeRangeFormatted: string;
  examinerName: string;
  targetJuz: string;
  locationLink: string;
}): string {
  const zoomLink = recipient.locationLink?.startsWith('http')
    ? recipient.locationLink
    : 'https://markaztikrar.id/ujian?tab=akhir';

  const examinerFormatted = formatMuallimahName(recipient.examinerName) || 'Ustadzah Najah Sungkar';
  const cleanJuz = (recipient.targetJuz || '30').trim();
  const targetJuzDisplay = cleanJuz.toLowerCase().startsWith('juz')
    ? cleanJuz
    : `Juz ${cleanJuz}`;
  const batchDisplay = recipient.batchName || 'Tikrar Tahfidz MTI Batch 3';

  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *${recipient.fullName}*,

Baarakallahu fiik. Kami menginformasikan pengingat resmi bahwa jadwal Ujian Akhir Lisan (Tasmi' Zoom) Ukhti pada program ${batchDisplay} insya Allah akan dilaksanakan *BESOK*:

📌 *RINCIAN JADWAL UJIAN AKHIR LISAN:*
• Hari / Tanggal: ${recipient.examDateFormatted}
• Waktu Sesi: Pukul ${recipient.timeRangeFormatted}
• Penguji Resmi: ${examinerFormatted}
• Target Hafalan: ${targetJuzDisplay}
• Ruang Temu Zoom / Meeting:
🔗 ${zoomLink}

📌 *PETUNJUK & PERSIAPAN UJIAN:*
1. Mohon hadir di ruang Zoom minimal 10 menit sebelum sesi dimulai.
2. Pastikan koneksi internet stabil dan perangkat kamera/audio dalam keadaan baik.
3. Berada di tempat yang tenang, kondusif, dan berpakaian rapi syar'i untuk tasmi' hafalan.
4. Siapkan mushaf di dekat Ukhti (hanya dibuka jika diarahkan oleh penguji).

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Semoga Allah Ta'ala senantiasa memudahkan, memberkahi, dan mengokohkan hafalan Al-Qur'an Ukhti saat ujian lisan besok. Aamiin.

Jazakillahu khairan.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`;
}

/**
 * Builds the official MTI WhatsApp Reminder message text for Examiner (Ustadzah)
 */
export function buildH1ExaminerOralExamMessage(recipient: ExaminerReminderCandidate): string {
  const sessionsText = recipient.sessions.map((s, idx) => {
    const sessionLabel = recipient.sessions.length > 1 ? `🔹 *Sesi ${idx + 1} (${s.timeRangeFormatted})*` : `🔹 *Waktu Sesi: ${s.timeRangeFormatted}*`;
    const zoomLink = s.locationLink?.startsWith('http') ? s.locationLink : 'https://markaztikrar.id/ujian';
    const notesLine = s.notes ? `\n• Catatan: _${s.notes}_` : '';
    
    const studentsList = s.students.length > 0
      ? s.students.map((st, i) => {
          const jz = st.targetJuz?.toLowerCase().startsWith('juz') ? st.targetJuz : `Juz ${st.targetJuz || '30'}`;
          return `  ${i + 1}. *${st.fullName}* (${jz})`;
        }).join('\n')
      : '  _(Belum ada thalibah terdaftar)_';

    return `${sessionLabel}
• Ruang Zoom: ${zoomLink}${notesLine}
• Thalibah Diuji (${s.students.length} orang):
${studentsList}`;
  }).join('\n\n');

  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. *${recipient.examinerName}*, hafizhakallah.

Baarakallahu fiikunna. Kami dari Tim Akademik Markaz Tikrar Indonesia menyampaikan pengingat jadwal amanah menguji *Ujian Akhir Lisan (Tasmi' Zoom)* yang insya Allah akan dilaksanakan *BESOK*:

🗓️ *AGENDA UJIAN LISAN BESOK:*
• Hari / Tanggal: *${recipient.examDateFormatted}*
• Total Sesi Menguji: *${recipient.sessions.length} Sesi*
• Total Thalibah Diuji: *${recipient.totalStudents} Orang*

📋 *RINCIAN SESI & DAFTAR PESERTA:*
${sessionsText}

🔗 *Tautan Input Nilai & Evaluasi Ujian:*
https://markaztikrar.id/ujian

*(Pesan otomatis dari Sistem Markaz Tikrar Indonesia).*

Jazaakillahu khairan katsiran atas dedikasi dan waktu Ustadzah dalam membimbing dan menguji para penghafal Al-Qur'an. Semoga Allah Ta'ala senantiasa melimpahkan kemudahan, kesehatan, dan keberkahan bagi Ustadzah sekeluarga. Aamiin.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`;
}

/**
 * Ensures reminder timestamp columns exist in tables
 */
export async function ensureReminderColumnExists(): Promise<void> {
  try {
    await query(`
      ALTER TABLE public.final_exam_registrations 
      ADD COLUMN IF NOT EXISTS reminder_h1_sent_at timestamp with time zone;

      ALTER TABLE public.final_exam_schedules 
      ADD COLUMN IF NOT EXISTS reminder_examiner_sent_at timestamp with time zone;
    `);
  } catch (err) {
    console.warn('[ExamReminder] Column check error (table might not exist yet):', err);
  }
}

/**
 * Retrieves candidates for H-1 Oral Exam Reminders (Thalibah)
 */
export async function getH1ExamCandidates(targetDate: string): Promise<ExamReminderCandidate[]> {
  await ensureReminderColumnExists();

  const sql = `
    SELECT DISTINCT ON (r.id)
      r.id as registration_id,
      r.user_id,
      r.schedule_id,
      r.status as registration_status,
      r.reminder_h1_sent_at,
      s.batch_id as schedule_batch_id,
      b.name as batch_name,
      s.exam_type,
      s.exam_date,
      s.start_time,
      s.end_time,
      s.location_link,
      s.notes as schedule_notes,
      u.full_name,
      COALESCE(
        NULLIF(TRIM(u.whatsapp), ''),
        NULLIF(TRIM(vat.whatsapp), ''),
        NULLIF(TRIM(du.confirmed_wa_phone), ''),
        NULLIF(TRIM(ptt.wa_phone), '')
      ) as raw_phone,
      COALESCE(
        vat.confirmed_chosen_juz,
        du.confirmed_chosen_juz,
        ptt.chosen_juz,
        '30'
      ) as target_juz,
      COALESCE(examiner.full_name, 'Najah Sungkar') as examiner_name
    FROM final_exam_registrations r
    JOIN final_exam_schedules s ON r.schedule_id = s.id
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users examiner ON s.examiner_id = examiner.id
    LEFT JOIN batches b ON s.batch_id = b.id
    LEFT JOIN v_active_thalibah vat ON (vat.user_id = u.id AND vat.batch_id = s.batch_id)
    LEFT JOIN daftar_ulang_submissions du ON (du.user_id = u.id AND du.batch_id = s.batch_id AND du.status = 'approved')
    LEFT JOIN pendaftaran_tikrar_tahfidz ptt ON (ptt.user_id = u.id AND ptt.batch_id = s.batch_id AND ptt.status = 'approved')
    WHERE s.exam_type = 'oral'
      AND s.status = 'active'
      AND r.status IN ('registered', 'confirmed')
      AND s.exam_date = $1
      AND (u.is_blacklisted IS NOT TRUE)
      AND (u.is_active IS NOT FALSE)
    ORDER BY r.id, s.start_time ASC, u.full_name ASC;
  `;

  const { rows } = await query(sql, [targetDate]);

  return rows.map((r: any) => ({
    registrationId: r.registration_id,
    userId: r.user_id,
    scheduleId: r.schedule_id,
    fullName: r.full_name,
    whatsapp: r.raw_phone || '',
    batchName: r.batch_name,
    examDate: r.exam_date,
    startTime: r.start_time,
    endTime: r.end_time,
    examinerName: formatMuallimahName(r.examiner_name),
    targetJuz: r.target_juz,
    locationLink: r.location_link,
    scheduleNotes: r.schedule_notes,
    alreadySent: Boolean(r.reminder_h1_sent_at),
    reminderSentAt: r.reminder_h1_sent_at,
  }));
}

/**
 * Retrieves candidates for H-1 Oral Exam Reminders (Examiners / Ustadzah)
 * Groups by examiner_id for the target exam_date
 */
export async function getH1ExaminerCandidates(targetDate: string): Promise<ExaminerReminderCandidate[]> {
  await ensureReminderColumnExists();

  const sql = `
    SELECT
      s.id as schedule_id,
      s.batch_id,
      b.name as batch_name,
      s.exam_date,
      s.start_time,
      s.end_time,
      s.location_link,
      s.notes as schedule_notes,
      s.reminder_examiner_sent_at,
      s.examiner_id,
      examiner.full_name as examiner_name,
      COALESCE(
        NULLIF(TRIM(examiner.whatsapp), ''),
        NULLIF(TRIM(examiner_vat.whatsapp), '')
      ) as examiner_phone,
      r.id as registration_id,
      r.user_id as thalibah_user_id,
      u.full_name as thalibah_name,
      COALESCE(
        NULLIF(TRIM(u.whatsapp), ''),
        NULLIF(TRIM(vat.whatsapp), ''),
        NULLIF(TRIM(du.confirmed_wa_phone), ''),
        NULLIF(TRIM(ptt.wa_phone), '')
      ) as thalibah_phone,
      COALESCE(
        vat.confirmed_chosen_juz,
        du.confirmed_chosen_juz,
        ptt.chosen_juz,
        '30'
      ) as target_juz
    FROM final_exam_schedules s
    JOIN users examiner ON s.examiner_id = examiner.id
    LEFT JOIN batches b ON s.batch_id = b.id
    LEFT JOIN v_active_thalibah examiner_vat ON (examiner_vat.user_id = examiner.id AND examiner_vat.batch_id = s.batch_id)
    LEFT JOIN final_exam_registrations r ON (r.schedule_id = s.id AND r.status IN ('registered', 'confirmed'))
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN v_active_thalibah vat ON (vat.user_id = u.id AND vat.batch_id = s.batch_id)
    LEFT JOIN daftar_ulang_submissions du ON (du.user_id = u.id AND du.batch_id = s.batch_id AND du.status = 'approved')
    LEFT JOIN pendaftaran_tikrar_tahfidz ptt ON (ptt.user_id = u.id AND ptt.batch_id = s.batch_id AND ptt.status = 'approved')
    WHERE s.exam_type = 'oral'
      AND s.status = 'active'
      AND s.exam_date = $1
      AND (examiner.is_blacklisted IS NOT TRUE)
      AND (examiner.is_active IS NOT FALSE)
    ORDER BY s.examiner_id, s.start_time ASC, s.id, u.full_name ASC;
  `;

  const { rows } = await query(sql, [targetDate]);

  // Group by examiner_id
  const examinerMap = new Map<string, {
    examinerId: string;
    examinerName: string;
    whatsapp: string;
    examDate: string;
    scheduleMap: Map<string, ExaminerSessionItem>;
  }>();

  for (const row of rows) {
    let ex = examinerMap.get(row.examiner_id);
    if (!ex) {
      ex = {
        examinerId: row.examiner_id,
        examinerName: formatMuallimahName(row.examiner_name),
        whatsapp: row.examiner_phone || '',
        examDate: row.exam_date,
        scheduleMap: new Map(),
      };
      examinerMap.set(row.examiner_id, ex);
    }

    let session = ex.scheduleMap.get(row.schedule_id);
    if (!session) {
      session = {
        scheduleId: row.schedule_id,
        batchName: row.batch_name,
        startTime: row.start_time,
        endTime: row.end_time,
        timeRangeFormatted: formatTimeRange(row.start_time, row.end_time),
        locationLink: row.location_link,
        notes: row.schedule_notes,
        alreadySent: Boolean(row.reminder_examiner_sent_at),
        reminderSentAt: row.reminder_examiner_sent_at,
        students: [],
      };
      ex.scheduleMap.set(row.schedule_id, session);
    }

    if (row.registration_id && row.thalibah_name) {
      session.students.push({
        registrationId: row.registration_id,
        userId: row.thalibah_user_id,
        fullName: row.thalibah_name,
        targetJuz: row.target_juz,
        whatsapp: row.thalibah_phone,
      });
    }
  }

  const result: ExaminerReminderCandidate[] = [];

  for (const ex of Array.from(examinerMap.values())) {
    const sessions = Array.from(ex.scheduleMap.values());
    const totalStudents = sessions.reduce((acc, s) => acc + s.students.length, 0);
    const scheduleIds = sessions.map(s => s.scheduleId);
    const alreadySent = sessions.every(s => s.alreadySent);
    const latestSentAt = sessions.map(s => s.reminderSentAt).filter(Boolean).sort().reverse()[0] || null;

    result.push({
      examinerId: ex.examinerId,
      examinerName: ex.examinerName,
      whatsapp: ex.whatsapp,
      examDate: ex.examDate,
      examDateFormatted: formatIndonesianDate(ex.examDate),
      sessions,
      totalStudents,
      scheduleIds,
      alreadySent,
      reminderSentAt: latestSentAt,
    });
  }

  return result;
}

/**
 * Main service to process and send H-1 oral exam reminders to Examiners via WhatsApp
 */
export async function sendH1ExaminerReminders(
  options: SendH1ExamRemindersOptions = {}
): Promise<SendH1ExaminerRemindersResult> {
  const targetDate = options.targetDate || getTomorrowWibDateString();
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);

  const examiners = await getH1ExaminerCandidates(targetDate);
  const toProcess = force ? examiners : examiners.filter(e => !e.alreadySent);

  const results: SendH1ExaminerRemindersResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const item of toProcess) {
    const formattedPhone = normalizePhoneNumber(item.whatsapp);
    if (!formattedPhone) {
      skippedCount++;
      results.push({
        examinerId: item.examinerId,
        examinerName: item.examinerName,
        whatsapp: item.whatsapp,
        success: false,
        error: 'Nomor WhatsApp ustadzah tidak valid atau kosong',
      });
      continue;
    }

    const messageText = buildH1ExaminerOralExamMessage(item);

    if (dryRun) {
      sentCount++;
      results.push({
        examinerId: item.examinerId,
        examinerName: item.examinerName,
        whatsapp: formattedPhone,
        success: true,
        messageId: `dry_run_${item.examinerId}`,
      });
      continue;
    }

    try {
      const sendRes = await whatsappService.sendTextMessage(formattedPhone, messageText);
      if (sendRes.success) {
        sentCount++;
        // Update database timestamp on all schedules for this examiner on this date
        await query(
          `UPDATE final_exam_schedules SET reminder_examiner_sent_at = NOW(), updated_at = NOW() WHERE id = ANY($1::uuid[])`,
          [item.scheduleIds]
        );

        results.push({
          examinerId: item.examinerId,
          examinerName: item.examinerName,
          whatsapp: formattedPhone,
          success: true,
          messageId: sendRes.messageId,
        });
      } else {
        failedCount++;
        results.push({
          examinerId: item.examinerId,
          examinerName: item.examinerName,
          whatsapp: formattedPhone,
          success: false,
          error: sendRes.error || 'Gagal mengirim WhatsApp ke ustadzah',
        });
      }

      await new Promise(res => setTimeout(res, 1200));
    } catch (err: any) {
      failedCount++;
      results.push({
        examinerId: item.examinerId,
        examinerName: item.examinerName,
        whatsapp: formattedPhone,
        success: false,
        error: err.message,
      });
    }
  }

  return {
    success: true,
    targetDate,
    dryRun,
    totalExaminers: examiners.length,
    sentCount,
    failedCount,
    skippedCount: skippedCount + (examiners.length - toProcess.length),
    results,
  };
}

/**
 * Main service to process and send H-1 oral exam reminders via WhatsApp (Thalibah)
 */
export async function sendH1ExamReminders(
  options: SendH1ExamRemindersOptions = {}
): Promise<SendH1ExamRemindersResult> {
  const targetDate = options.targetDate || getTomorrowWibDateString();
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);

  const candidates = await getH1ExamCandidates(targetDate);
  const toProcess = force ? candidates : candidates.filter(c => !c.alreadySent);

  const results: SendH1ExamRemindersResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const item of toProcess) {
    const formattedPhone = normalizePhoneNumber(item.whatsapp);
    if (!formattedPhone) {
      skippedCount++;
      results.push({
        registrationId: item.registrationId,
        fullName: item.fullName,
        whatsapp: item.whatsapp,
        success: false,
        error: 'Nomor WhatsApp tidak valid atau kosong',
      });
      continue;
    }

    const messageText = buildH1OralExamMessage({
      fullName: item.fullName,
      batchName: item.batchName,
      examDateFormatted: formatIndonesianDate(item.examDate),
      timeRangeFormatted: formatTimeRange(item.startTime, item.endTime),
      examinerName: item.examinerName,
      targetJuz: item.targetJuz,
      locationLink: item.locationLink,
    });

    if (dryRun) {
      sentCount++;
      results.push({
        registrationId: item.registrationId,
        fullName: item.fullName,
        whatsapp: formattedPhone,
        success: true,
        messageId: `dry_run_${item.registrationId}`,
      });
      continue;
    }

    // Live WhatsApp dispatch
    try {
      const sendRes = await whatsappService.sendTextMessage(formattedPhone, messageText);
      if (sendRes.success) {
        sentCount++;
        // Update database timestamp to prevent duplicate reminder
        await query(
          `UPDATE final_exam_registrations SET reminder_h1_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [item.registrationId]
        );

        results.push({
          registrationId: item.registrationId,
          fullName: item.fullName,
          whatsapp: formattedPhone,
          success: true,
          messageId: sendRes.messageId,
        });
      } else {
        failedCount++;
        results.push({
          registrationId: item.registrationId,
          fullName: item.fullName,
          whatsapp: formattedPhone,
          success: false,
          error: sendRes.error || 'Gagal mengirim WhatsApp',
        });
      }

      // Small delay between sends to respect gateway rate limits
      await new Promise(res => setTimeout(res, 1200));
    } catch (err: any) {
      failedCount++;
      results.push({
        registrationId: item.registrationId,
        fullName: item.fullName,
        whatsapp: formattedPhone,
        success: false,
        error: err.message,
      });
    }
  }

  return {
    success: true,
    targetDate,
    dryRun,
    totalCandidates: candidates.length,
    sentCount,
    failedCount,
    skippedCount: skippedCount + (candidates.length - toProcess.length),
    results,
  };
}
