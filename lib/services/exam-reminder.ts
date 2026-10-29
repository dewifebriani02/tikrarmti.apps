import { query } from '@/lib/db';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';

export interface ExamReminderCandidate {
  registrationId: string;
  userId: string;
  scheduleId: string;
  fullName: string;
  whatsapp: string;
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
 * Builds the official MTI WhatsApp Reminder message text
 */
export function buildH1OralExamMessage(recipient: {
  fullName: string;
  examDateFormatted: string;
  timeRangeFormatted: string;
  examinerName: string;
  targetJuz: string;
  locationLink: string;
}): string {
  const zoomLink = recipient.locationLink?.startsWith('http')
    ? recipient.locationLink
    : 'https://markaztikrar.id/ujian?tab=akhir';

  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *${recipient.fullName}*,

Baarakallahu fiik. Kami menginformasikan pengingat resmi bahwa jadwal Ujian Akhir Lisan (Tasmi' Zoom) Ukhti pada program Tikrar Tahfidz MTI Batch 3 insya Allah akan dilaksanakan *BESOK*:

📌 *RINCIAN JADWAL UJIAN AKHIR LISAN:*
• Hari / Tanggal: ${recipient.examDateFormatted}
• Waktu Sesi: Pukul ${recipient.timeRangeFormatted}
• Penguji Resmi: ${recipient.examinerName}
• Target Hafalan: Juz ${recipient.targetJuz}
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
 * Ensures the reminder_h1_sent_at column exists in final_exam_registrations
 */
export async function ensureReminderColumnExists(): Promise<void> {
  try {
    await query(`
      ALTER TABLE public.final_exam_registrations 
      ADD COLUMN IF NOT EXISTS reminder_h1_sent_at timestamp with time zone;
    `);
  } catch (err) {
    console.warn('[ExamReminder] Column check error (table might not exist yet):', err);
  }
}

/**
 * Retrieves candidates for H-1 Oral Exam Reminders
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
      s.exam_type,
      s.exam_date,
      s.start_time,
      s.end_time,
      s.location_link,
      s.notes as schedule_notes,
      u.full_name,
      COALESCE(NULLIF(TRIM(u.whatsapp), ''), NULLIF(TRIM(vat.whatsapp), '')) as raw_phone,
      COALESCE(vat.confirmed_chosen_juz, '30') as target_juz,
      COALESCE(examiner.full_name, 'Ustadzah Najah Sungkar') as examiner_name
    FROM final_exam_registrations r
    JOIN final_exam_schedules s ON r.schedule_id = s.id
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users examiner ON s.examiner_id = examiner.id
    LEFT JOIN v_active_thalibah vat ON vat.user_id = u.id
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
    examDate: r.exam_date,
    startTime: r.start_time,
    endTime: r.end_time,
    examinerName: r.examiner_name,
    targetJuz: r.target_juz,
    locationLink: r.location_link,
    scheduleNotes: r.schedule_notes,
    alreadySent: Boolean(r.reminder_h1_sent_at),
    reminderSentAt: r.reminder_h1_sent_at,
  }));
}

/**
 * Main service to process and send H-1 oral exam reminders via WhatsApp
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
