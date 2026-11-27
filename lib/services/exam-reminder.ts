import { query } from '@/lib/db';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';
import { getWhatsAppAutoMessagesConfig } from '@/lib/services/whatsapp-auto-settings';
import {
  waitBetweenWhatsAppMessages,
  classifyWhatsAppError,
} from '@/lib/utils/whatsapp-throttle';
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

export interface WrittenExamReminderCandidate {
  userId: string;
  fullName: string;
  whatsapp: string;
  batchId: string;
  batchName: string;
  targetJuz: string;
  scheduleId: string;
  openDate: string;
  closeDate: string;
  openTime: string;
  closeTime: string;
  openDateTimeFormatted: string;
  closeDateTimeFormatted: string;
  hasCompletedWrittenExam: boolean;
}

export interface SendH1ExamRemindersOptions {
  targetDate?: string; // YYYY-MM-DD (Defaults to tomorrow in Asia/Jakarta)
  dryRun?: boolean;
  force?: boolean;
}

export interface SendWrittenExamRemindersOptions {
  mode: 'open' | 'deadline';
  targetDate?: string; // YYYY-MM-DD (Defaults to today in Asia/Jakarta)
  batchId?: string;
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
  stoppedEarly?: boolean;
  stopReason?: string | null;
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
  stoppedEarly?: boolean;
  stopReason?: string | null;
  results: {
    examinerId: string;
    examinerName: string;
    whatsapp: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

export interface SendWrittenExamRemindersResult {
  success: boolean;
  mode: 'open' | 'deadline';
  targetDate: string;
  dryRun: boolean;
  totalCandidates: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  stoppedEarly?: boolean;
  stopReason?: string | null;
  results: {
    userId: string;
    fullName: string;
    whatsapp: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

/**
 * Returns today's date string in YYYY-MM-DD based on Asia/Jakarta timezone (WIB)
 */
export function getTodayWibDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
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
 * Builds the official MTI WhatsApp Notification for Written Final Exam Opening & Deadline
 */
export function buildWrittenExamOpenMessage(recipient: {
  fullName: string;
  batchName?: string;
  targetJuz?: string;
  openDateTimeFormatted: string;
  closeDateTimeFormatted: string;
}): string {
  const batchDisplay = recipient.batchName || 'Tikrar Tahfidz MTI Batch 3';
  const cleanJuz = (recipient.targetJuz || '30').trim();
  const targetJuzDisplay = cleanJuz.toLowerCase().startsWith('juz')
    ? cleanJuz
    : `Juz ${cleanJuz}`;

  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *${recipient.fullName}*,

Baarakallahu fiik. Kami menginformasikan bahwa *Ujian Akhir Tulisan (CBT Pilihan Ganda)* pada program *${batchDisplay}* (${targetJuzDisplay}) telah resmi *DIBUKA*:

📌 *JADWAL & BATAS AKHIR UJIAN TULISAN:*
• *Dibuka Mulai:* ${recipient.openDateTimeFormatted}
• *Batas Akhir Pengerjaan (Tutup):* ${recipient.closeDateTimeFormatted}
• *Jumlah Soal & Durasi:* 50 Soal Pilihan Ganda (Maks. 60 Menit)

🔗 *Akses Portal Ujian Akhir CBT:*
https://markaztikrar.id/ujian

📌 *PETUNJUK PENGERJAAN UJIAN TULISAN:*
1. Ujian tulisan wajib dikerjakan secara mandiri dan *closed-book* (tanpa membuka mushaf).
2. Pastikan koneksi internet stabil sebelum menekan tombol *Mulai Ujian*.
3. Harap menyelesaikan dan mengirim (*submit*) jawaban sebelum batas akhir penutupan ujian di atas.

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Semoga Allah Ta'ala senantiasa memberikan kemudahan, ketenangan, dan keberkahan bagi Ukhti dalam menyelesaikan Ujian Akhir. Aamiin.

Jazakillahu khairan.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`;
}

/**
 * Builds the official MTI WhatsApp Reminder for Written Final Exam Deadline (for thalibah who haven't submitted yet)
 */
export function buildWrittenExamDeadlineMessage(recipient: {
  fullName: string;
  batchName?: string;
  targetJuz?: string;
  openDateTimeFormatted?: string;
  closeDateTimeFormatted: string;
}): string {
  const batchDisplay = recipient.batchName || 'Tikrar Tahfidz MTI Batch 3';
  const cleanJuz = (recipient.targetJuz || '30').trim();
  const targetJuzDisplay = cleanJuz.toLowerCase().startsWith('juz')
    ? cleanJuz
    : `Juz ${cleanJuz}`;

  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *${recipient.fullName}*,

Semoga Ukhti senantiasa dalam lindungan dan kemudahan dari Allah Ta'ala.

Kami dari Tim Akademik Markaz Tikrar Indonesia mengingatkan bahwa berdasarkan data sistem, Ukhti tercatat *belum menyelesaikan Ujian Akhir Tulisan (CBT)* untuk program *${batchDisplay}* (${targetJuzDisplay}).

⏰ *BATAS AKHIR PENGERJAAN UJIAN TULISAN:*
• *Ditutup pada:* *${recipient.closeDateTimeFormatted}*
• *Tautan Ujian CBT:* 🔗 https://markaztikrar.id/ujian

Mohon segera meluangkan waktu untuk mengerjakan dan mengirim (*submit*) Ujian Akhir Tulisan sebelum sesi ujian ditutup otomatis oleh sistem.

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Semoga Allah Ta'ala memudahkan dan memberkahi ujian Ukhti. Aamiin.

Jazakillahu khairan.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`;
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

      ALTER TABLE public.final_exam_schedules 
      ADD COLUMN IF NOT EXISTS reminder_written_open_sent_at timestamp with time zone;

      ALTER TABLE public.final_exam_schedules 
      ADD COLUMN IF NOT EXISTS reminder_written_deadline_sent_at timestamp with time zone;
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
 * Retrieves candidates for Written Final Exam notifications (mode: 'open' or 'deadline')
 */
export async function getWrittenExamReminderCandidates(options: {
  mode: 'open' | 'deadline';
  targetDate?: string;
  batchId?: string;
  force?: boolean;
}): Promise<WrittenExamReminderCandidate[]> {
  await ensureReminderColumnExists();

  const today = options.targetDate || getTodayWibDateString();
  const tomorrow = getTomorrowWibDateString();

  // Find active written schedules matching the date criteria (unless batchId + force is passed)
  const scheduleParams: any[] = [];
  let whereSql = `s.exam_type = 'written' AND s.status = 'active'`;

  if (options.batchId) {
    scheduleParams.push(options.batchId);
    whereSql += ` AND s.batch_id = $${scheduleParams.length}`;
  } else if (options.mode === 'open') {
    scheduleParams.push(today);
    whereSql += ` AND s.exam_date::text = $${scheduleParams.length}`;
    if (!options.force) {
      whereSql += ` AND s.reminder_written_open_sent_at IS NULL`;
    }
  } else {
    // mode === 'deadline': triggers on H-1 or Final Day (today or tomorrow equals end_date)
    scheduleParams.push(today, tomorrow);
    whereSql += ` AND COALESCE(s.end_date, s.exam_date)::text IN ($${scheduleParams.length - 1}, $${scheduleParams.length})`;
    if (!options.force) {
      whereSql += ` AND (s.reminder_written_deadline_sent_at IS NULL OR s.reminder_written_deadline_sent_at::date < CURRENT_DATE)`;
    }
  }

  const { rows: writtenSchedules } = await query(
    `SELECT
       s.id AS schedule_id,
       s.batch_id,
       b.name AS batch_name,
       s.exam_date::text AS open_date,
       COALESCE(s.end_date, s.exam_date)::text AS close_date,
       COALESCE(s.start_time::text, '00:00:00') AS open_time,
       COALESCE(s.end_time::text, '23:59:00') AS close_time
     FROM final_exam_schedules s
     JOIN batches b ON b.id = s.batch_id
     WHERE ${whereSql}
     ORDER BY s.updated_at DESC`,
    scheduleParams
  );

  if (writtenSchedules.length === 0) {
    return [];
  }

  const candidates: WrittenExamReminderCandidate[] = [];

  for (const sched of writtenSchedules) {
    const openDateFmt = `${formatIndonesianDate(sched.open_date)} pukul ${sched.open_time.slice(0, 5)} WIB`;
    const closeDateFmt = `${formatIndonesianDate(sched.close_date)} pukul ${sched.close_time.slice(0, 5)} WIB`;

    const { rows: students } = await query(
      `SELECT
         vat.user_id,
         vat.full_name,
         vat.whatsapp,
         COALESCE(vat.confirmed_chosen_juz, '30') AS target_juz,
         EXISTS (
           SELECT 1
           FROM exam_attempts ea
           JOIN pendaftaran_tikrar_tahfidz ptt ON ptt.id = ea.registration_id
           WHERE ea.user_id = vat.user_id
             AND ptt.batch_id = vat.batch_id
             AND ea.exam_type = 'final-exam'
             AND ea.status IN ('submitted', 'graded')
         ) AS has_completed_written
       FROM v_active_thalibah vat
       WHERE vat.batch_id = $1
         AND vat.whatsapp IS NOT NULL
         AND TRIM(vat.whatsapp) != ''
       ORDER BY vat.full_name ASC`,
      [sched.batch_id]
    );

    for (const st of students) {
      const hasCompleted = Boolean(st.has_completed_written);
      if (options.mode === 'deadline' && hasCompleted) {
        continue;
      }
      candidates.push({
        userId: st.user_id,
        fullName: st.full_name,
        whatsapp: st.whatsapp,
        batchId: sched.batch_id,
        batchName: sched.batch_name,
        targetJuz: st.target_juz,
        scheduleId: sched.schedule_id,
        openDate: sched.open_date,
        closeDate: sched.close_date,
        openTime: sched.open_time,
        closeTime: sched.close_time,
        openDateTimeFormatted: openDateFmt,
        closeDateTimeFormatted: closeDateFmt,
        hasCompletedWrittenExam: hasCompleted,
      });
    }
  }

  return candidates;
}

/**
 * Main service to process and send Written Final Exam Open / Deadline notifications via WhatsApp
 */
export async function sendWrittenExamReminders(
  options: SendWrittenExamRemindersOptions
): Promise<SendWrittenExamRemindersResult> {
  const targetDate = options.targetDate || getTodayWibDateString();
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);
  const mode = options.mode;

  if (!dryRun) {
    const { config: autoConfig } = await getWhatsAppAutoMessagesConfig();
    if (mode === 'open' && !autoConfig.reminder_ujian_tulisan_dibuka) {
      return {
        success: true,
        mode,
        targetDate,
        dryRun,
        totalCandidates: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        stoppedEarly: true,
        stopReason: 'Notifikasi Pembukaan Ujian Tulisan sedang dinonaktifkan oleh Admin di /admin/whatsapp',
        results: [],
      };
    }
    if (mode === 'deadline' && !autoConfig.reminder_ujian_tulisan_deadline) {
      return {
        success: true,
        mode,
        targetDate,
        dryRun,
        totalCandidates: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        stoppedEarly: true,
        stopReason: 'Pengingat Batas Akhir Ujian Tulisan sedang dinonaktifkan oleh Admin di /admin/whatsapp',
        results: [],
      };
    }
  }

  const candidates = await getWrittenExamReminderCandidates({
    mode,
    targetDate,
    batchId: options.batchId,
    force,
  });

  const results: SendWrittenExamRemindersResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let stoppedEarly = false;
  let stopReason: string | null = null;
  let consecutiveGatewayErrors = 0;

  if (!dryRun && candidates.length > 0) {
    const waStatus = await whatsappService.getStatus();
    if (!waStatus.configured || !waStatus.watzap?.isConnected) {
      stoppedEarly = true;
      stopReason = !waStatus.configured
        ? 'WatZap belum dikonfigurasi'
        : 'Instance WhatsApp sedang offline/terputus — notifikasi ujian tulisan dibatalkan';
      return {
        success: true,
        mode,
        targetDate,
        dryRun,
        totalCandidates: candidates.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount: candidates.length,
        stoppedEarly,
        stopReason,
        results: [],
      };
    }
  }

  const touchedScheduleIds = new Set<string>();
  let processedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    processedCount++;

    const formattedPhone = normalizePhoneNumber(item.whatsapp);
    if (!formattedPhone) {
      skippedCount++;
      results.push({
        userId: item.userId,
        fullName: item.fullName,
        whatsapp: item.whatsapp,
        success: false,
        error: 'Nomor WhatsApp tidak valid atau kosong',
      });
      continue;
    }

    const messageText =
      mode === 'open'
        ? buildWrittenExamOpenMessage({
            fullName: item.fullName,
            batchName: item.batchName,
            targetJuz: item.targetJuz,
            openDateTimeFormatted: item.openDateTimeFormatted,
            closeDateTimeFormatted: item.closeDateTimeFormatted,
          })
        : buildWrittenExamDeadlineMessage({
            fullName: item.fullName,
            batchName: item.batchName,
            targetJuz: item.targetJuz,
            openDateTimeFormatted: item.openDateTimeFormatted,
            closeDateTimeFormatted: item.closeDateTimeFormatted,
          });

    if (dryRun) {
      sentCount++;
      results.push({
        userId: item.userId,
        fullName: item.fullName,
        whatsapp: formattedPhone,
        success: true,
        messageId: `dry_run_${mode}_${item.userId}`,
      });
      continue;
    }

    try {
      const sendRes = await whatsappService.sendTextMessage(formattedPhone, messageText, {
        sourceTag: mode === 'open' ? 'cron_ujian_tulisan_open' : 'cron_ujian_tulisan_deadline',
        recipientName: item.fullName,
      });
      if (sendRes.success) {
        sentCount++;
        consecutiveGatewayErrors = 0;
        touchedScheduleIds.add(item.scheduleId);
        results.push({
          userId: item.userId,
          fullName: item.fullName,
          whatsapp: formattedPhone,
          success: true,
          messageId: sendRes.messageId,
        });
      } else {
        failedCount++;
        results.push({
          userId: item.userId,
          fullName: item.fullName,
          whatsapp: formattedPhone,
          success: false,
          error: sendRes.error || 'Gagal mengirim WhatsApp',
        });

        const errClass = classifyWhatsAppError(sendRes.error, {
          rateLimited: sendRes.rateLimited,
          fatalInstanceError: sendRes.fatalInstanceError,
        });
        if (errClass.shouldStopBatch) {
          stoppedEarly = true;
          stopReason = sendRes.error || 'Notifikasi ujian tulisan dihentikan karena rate-limit / instance error';
          break;
        }
        if (sendRes.provider !== 'none') {
          consecutiveGatewayErrors++;
          if (consecutiveGatewayErrors >= 3) {
            stoppedEarly = true;
            stopReason = `Notifikasi ujian tulisan dihentikan setelah ${consecutiveGatewayErrors} kegagalan berturut-turut`;
            break;
          }
        }
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        userId: item.userId,
        fullName: item.fullName,
        whatsapp: formattedPhone,
        success: false,
        error: err.message,
      });
      consecutiveGatewayErrors++;
      if (consecutiveGatewayErrors >= 3) {
        stoppedEarly = true;
        stopReason = `Notifikasi ujian tulisan dihentikan setelah ${consecutiveGatewayErrors} exception berturut-turut`;
        break;
      }
    }

    await waitBetweenWhatsAppMessages(i, candidates.length);
  }

  if (!dryRun && touchedScheduleIds.size > 0 && !stoppedEarly) {
    const col =
      mode === 'open' ? 'reminder_written_open_sent_at' : 'reminder_written_deadline_sent_at';
    await query(
      `UPDATE final_exam_schedules SET ${col} = NOW(), updated_at = NOW() WHERE id = ANY($1::uuid[])`,
      [Array.from(touchedScheduleIds)]
    );
  }

  const unreachedCount = Math.max(0, candidates.length - processedCount);

  return {
    success: true,
    mode,
    targetDate,
    dryRun,
    totalCandidates: candidates.length,
    sentCount,
    failedCount,
    skippedCount: skippedCount + unreachedCount,
    stoppedEarly,
    stopReason,
    results,
  };
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

  if (!dryRun) {
    const { config: autoConfig } = await getWhatsAppAutoMessagesConfig();
    if (!autoConfig.reminder_ujian_lisan_examiner) {
      console.log('[ExamReminder] Skipped examiner reminders: disabled by admin setting.');
      return {
        success: true,
        targetDate,
        dryRun,
        totalExaminers: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        stoppedEarly: true,
        stopReason: 'Pengingat otomatis H-1 Ujian Lisan (Ustadzah Penguji) sedang dinonaktifkan oleh Admin di /admin/whatsapp',
        results: [],
      };
    }
  }

  const examiners = await getH1ExaminerCandidates(targetDate);
  const toProcess = force ? examiners : examiners.filter(e => !e.alreadySent);

  const results: SendH1ExaminerRemindersResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let stoppedEarly = false;
  let stopReason: string | null = null;
  let consecutiveGatewayErrors = 0;

  if (!dryRun && toProcess.length > 0) {
    const waStatus = await whatsappService.getStatus();
    if (!waStatus.configured || !waStatus.watzap?.isConnected) {
      stoppedEarly = true;
      stopReason = !waStatus.configured
        ? 'WatZap belum dikonfigurasi'
        : 'Instance WhatsApp (utama & cadangan) sedang offline/terputus — reminder penguji dibatalkan';
      return {
        success: true,
        targetDate,
        dryRun,
        totalExaminers: examiners.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount: examiners.length,
        stoppedEarly,
        stopReason,
        results: [],
      };
    }
  }

  let processedCount = 0;
  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    processedCount++;

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
      const sendRes = await whatsappService.sendTextMessage(formattedPhone, messageText, { sourceTag: 'cron_ujian_lisan' });
      if (sendRes.success) {
        sentCount++;
        consecutiveGatewayErrors = 0;
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

        const errClass = classifyWhatsAppError(sendRes.error, {
          rateLimited: sendRes.rateLimited,
          fatalInstanceError: sendRes.fatalInstanceError,
        });
        if (errClass.shouldStopBatch) {
          stoppedEarly = true;
          stopReason = sendRes.error || 'Reminder penguji dihentikan karena rate-limit / instance WatZap error';
          console.warn(`[ExamReminder] Stopping examiner batch early: ${stopReason}`);
          break;
        }
        if (sendRes.provider !== 'none') {
          consecutiveGatewayErrors++;
          if (consecutiveGatewayErrors >= 3) {
            stoppedEarly = true;
            stopReason = `Reminder penguji dihentikan setelah ${consecutiveGatewayErrors} kegagalan gateway berturut-turut`;
            break;
          }
        }
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        examinerId: item.examinerId,
        examinerName: item.examinerName,
        whatsapp: formattedPhone,
        success: false,
        error: err.message,
      });
      consecutiveGatewayErrors++;
      if (consecutiveGatewayErrors >= 3) {
        stoppedEarly = true;
        stopReason = `Reminder penguji dihentikan setelah ${consecutiveGatewayErrors} exception berturut-turut`;
        break;
      }
    }

    await waitBetweenWhatsAppMessages(i, toProcess.length);
  }

  const unreachedCount = Math.max(0, toProcess.length - processedCount);

  return {
    success: true,
    targetDate,
    dryRun,
    totalExaminers: examiners.length,
    sentCount,
    failedCount,
    skippedCount: skippedCount + unreachedCount + (examiners.length - toProcess.length),
    stoppedEarly,
    stopReason,
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

  if (!dryRun) {
    const { config: autoConfig } = await getWhatsAppAutoMessagesConfig();
    if (!autoConfig.reminder_ujian_lisan_thalibah) {
      console.log('[ExamReminder] Skipped thalibah reminders: disabled by admin setting.');
      return {
        success: true,
        targetDate,
        dryRun,
        totalCandidates: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        stoppedEarly: true,
        stopReason: 'Pengingat otomatis H-1 Ujian Lisan (Thalibah) sedang dinonaktifkan oleh Admin di /admin/whatsapp',
        results: [],
      };
    }
  }

  const candidates = await getH1ExamCandidates(targetDate);
  const toProcess = force ? candidates : candidates.filter(c => !c.alreadySent);

  const results: SendH1ExamRemindersResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let stoppedEarly = false;
  let stopReason: string | null = null;
  let consecutiveGatewayErrors = 0;

  if (!dryRun && toProcess.length > 0) {
    const waStatus = await whatsappService.getStatus();
    if (!waStatus.configured || !waStatus.watzap?.isConnected) {
      stoppedEarly = true;
      stopReason = !waStatus.configured
        ? 'WatZap belum dikonfigurasi'
        : 'Instance WhatsApp (utama & cadangan) sedang offline/terputus — reminder thalibah dibatalkan';
      return {
        success: true,
        targetDate,
        dryRun,
        totalCandidates: candidates.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount: candidates.length,
        stoppedEarly,
        stopReason,
        results: [],
      };
    }
  }

  let processedCount = 0;
  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    processedCount++;

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
      const sendRes = await whatsappService.sendTextMessage(formattedPhone, messageText, { sourceTag: 'cron_ujian_lisan' });
      if (sendRes.success) {
        sentCount++;
        consecutiveGatewayErrors = 0;
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

        const errClass = classifyWhatsAppError(sendRes.error, {
          rateLimited: sendRes.rateLimited,
          fatalInstanceError: sendRes.fatalInstanceError,
        });
        if (errClass.shouldStopBatch) {
          stoppedEarly = true;
          stopReason = sendRes.error || 'Reminder ujian dihentikan karena rate-limit / instance WatZap error';
          console.warn(`[ExamReminder] Stopping thalibah batch early: ${stopReason}`);
          break;
        }
        if (sendRes.provider !== 'none') {
          consecutiveGatewayErrors++;
          if (consecutiveGatewayErrors >= 3) {
            stoppedEarly = true;
            stopReason = `Reminder ujian dihentikan setelah ${consecutiveGatewayErrors} kegagalan gateway berturut-turut`;
            break;
          }
        }
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        registrationId: item.registrationId,
        fullName: item.fullName,
        whatsapp: formattedPhone,
        success: false,
        error: err.message,
      });
      consecutiveGatewayErrors++;
      if (consecutiveGatewayErrors >= 3) {
        stoppedEarly = true;
        stopReason = `Reminder ujian dihentikan setelah ${consecutiveGatewayErrors} exception berturut-turut`;
        break;
      }
    }

    // Safe randomized 4-7s throttle + 25-35s pause every 15 messages
    await waitBetweenWhatsAppMessages(i, toProcess.length);
  }

  const unreachedCount = Math.max(0, toProcess.length - processedCount);

  return {
    success: true,
    targetDate,
    dryRun,
    totalCandidates: candidates.length,
    sentCount,
    failedCount,
    skippedCount: skippedCount + unreachedCount + (candidates.length - toProcess.length),
    stoppedEarly,
    stopReason,
    results,
  };
}
