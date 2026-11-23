import { query } from '@/lib/db';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';
import { getWhatsAppAutoMessagesConfig } from '@/lib/services/whatsapp-auto-settings';
import {
  waitBetweenWhatsAppMessages,
  classifyWhatsAppError,
} from '@/lib/utils/whatsapp-throttle';
import {
  getTomorrowWibDateString,
  formatIndonesianDate,
} from '@/lib/services/exam-reminder';
import { formatMuallimahName } from '@/lib/roles';

export interface PaidClassThalibahCandidate {
  registrationId: string;
  paidClassId: string;
  userId: string | null;
  fullName: string;
  whatsapp: string;
  className: string;
  subjectMaterial: string;
  ustadzahName: string;
  scheduleDay: string;
  timeStart: string;
  timeEnd: string;
  timezone: string;
  durationInfo?: string | null;
  startDate: string;
  estimatedEndDate?: string | null;
  zoomLink?: string | null;
  whatsappGroupLink?: string | null;
  alreadySent: boolean;
  reminderSentAt?: string | null;
}

export interface PaidClassUstadzahStudent {
  registrationId: string;
  fullName: string;
  whatsapp: string;
  status: string;
}

export interface PaidClassUstadzahCandidate {
  paidClassId: string;
  muallimahId: string;
  ustadzahName: string;
  whatsapp: string;
  className: string;
  subjectMaterial: string;
  scheduleDay: string;
  timeStart: string;
  timeEnd: string;
  timezone: string;
  durationInfo?: string | null;
  startDate: string;
  estimatedEndDate?: string | null;
  zoomLink?: string | null;
  whatsappGroupLink?: string | null;
  students: PaidClassUstadzahStudent[];
  alreadySent: boolean;
  reminderSentAt?: string | null;
}

export interface SendH1PaidClassRemindersOptions {
  targetDate?: string; // YYYY-MM-DD (Defaults to tomorrow in Asia/Jakarta)
  dryRun?: boolean;
  force?: boolean;
}

export interface SendH1PaidClassThalibahResult {
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
    className: string;
    whatsapp: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

export interface SendH1PaidClassUstadzahResult {
  success: boolean;
  targetDate: string;
  dryRun: boolean;
  totalClasses: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  stoppedEarly?: boolean;
  stopReason?: string | null;
  results: {
    paidClassId: string;
    ustadzahName: string;
    className: string;
    whatsapp: string;
    studentCount: number;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

export function buildH1PaidClassThalibahMessage(recipient: {
  fullName: string;
  className: string;
  subjectMaterial: string;
  ustadzahName: string;
  scheduleDay: string;
  timeStart: string;
  timeEnd: string;
  timezone?: string;
  durationInfo?: string | null;
  startDateFormatted: string;
  estimatedEndDateFormatted?: string | null;
  zoomLink?: string | null;
  whatsappGroupLink?: string | null;
}): string {
  const tz = recipient.timezone || 'WIB';
  const ustadzahFormatted = formatMuallimahName(recipient.ustadzahName) || 'Ustadzah MTI';
  const durationLine = recipient.durationInfo
    ? `\n• Durasi Program: ${recipient.durationInfo}`
    : '';
  const endLine = recipient.estimatedEndDateFormatted
    ? `\n• Estimasi Selesai: ${recipient.estimatedEndDateFormatted}`
    : '';
  const zoomBlock = recipient.zoomLink?.startsWith('http')
    ? `\n• Ruang Temu Zoom:\n🔗 ${recipient.zoomLink}`
    : '';
  const waGroupBlock = recipient.whatsappGroupLink?.startsWith('http')
    ? `\n• Grup WhatsApp Kelas:\n💬 ${recipient.whatsappGroupLink}`
    : '';

  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Ukhti *${recipient.fullName}*,

Baarakallahu fiik. Kami mengingatkan bahwa *Kelas Berbayar Resmi Markaz Tikrar Indonesia (MTI)* yang Ukhti ikuti insya Allah akan *MULAI BESOK*:

📌 *RINCIAN KELAS BIMBINGAN:*
• Program Kelas: *${recipient.className}*
• Fokus Materi: ${recipient.subjectMaterial}
• Pengampu: *${ustadzahFormatted}*
• Tanggal Mulai: *${recipient.startDateFormatted}*${endLine}${durationLine}
• Jadwal Rutin: ${recipient.scheduleDay} (${recipient.timeStart.slice(0, 5)} – ${recipient.timeEnd.slice(0, 5)} ${tz})${zoomBlock}${waGroupBlock}

📌 *PERSIAPAN PERTEMUAN PERDANA:*
1. Pastikan sudah bergabung di Grup WhatsApp kelas untuk koordinasi bersama Ustadzah.
2. Siapkan mushaf, alat tulis/catatan, serta koneksi internet yang stabil 10 menit sebelum kelas dimulai.
3. Niatkan ikhlas lillahita'ala dalam menuntut ilmu Al-Qur'an.

*(Mohon tidak membalas pesan ini karena dikirim secara otomatis oleh sistem).*

Semoga Allah Ta'ala senantiasa memberkahi waktu, melapangkan pemahaman, dan mempermudah perjalanan belajar Ukhti hingga tuntas. Aamiin.

Jazakillahu khairan.
Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id/pendaftaran/kelas-berbayar`;
}

export function buildH1PaidClassUstadzahMessage(recipient: {
  ustadzahName: string;
  className: string;
  subjectMaterial: string;
  scheduleDay: string;
  timeStart: string;
  timeEnd: string;
  timezone?: string;
  durationInfo?: string | null;
  startDateFormatted: string;
  estimatedEndDateFormatted?: string | null;
  zoomLink?: string | null;
  whatsappGroupLink?: string | null;
  students: PaidClassUstadzahStudent[];
}): string {
  const tz = recipient.timezone || 'WIB';
  const ustadzahFormatted = formatMuallimahName(recipient.ustadzahName) || 'Ustadzah MTI';
  const durationLine = recipient.durationInfo
    ? `\n• Durasi Program: ${recipient.durationInfo}`
    : '';
  const endLine = recipient.estimatedEndDateFormatted
    ? `\n• Estimasi Selesai: ${recipient.estimatedEndDateFormatted}`
    : '';
  const zoomBlock = recipient.zoomLink?.startsWith('http')
    ? `\n• Ruang Zoom: ${recipient.zoomLink}`
    : '';
  const waGroupBlock = recipient.whatsappGroupLink?.startsWith('http')
    ? `\n• Grup WhatsApp Kelas: ${recipient.whatsappGroupLink}`
    : '';

  const studentsText =
    recipient.students.length > 0
      ? recipient.students
          .map((s, idx) => `  ${idx + 1}. *${s.fullName}* (${s.whatsapp || '-'})`)
          .join('\n')
      : '  _(Belum ada thalibah terdaftar saat ini)_';

  return `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. *${ustadzahFormatted}*, hafizhakallah.

Baarakallahu fiikunna. Kami dari Tim Akademik Markaz Tikrar Indonesia (MTI) menyampaikan pengingat jadwal bahwa kelas bimbingan berbayar yang Ustadzah ampu insya Allah akan *MULAI BESOK*:

🗓️ *AGENDA MULAI KELAS BESOK:*
• Program Kelas: *${recipient.className}*
• Fokus Materi: ${recipient.subjectMaterial}
• Tanggal Mulai: *${recipient.startDateFormatted}*${endLine}${durationLine}
• Jadwal Rutin: ${recipient.scheduleDay} (${recipient.timeStart.slice(0, 5)} – ${recipient.timeEnd.slice(0, 5)} ${tz})${zoomBlock}${waGroupBlock}

📋 *THALIBAH TERDAFTAR (${recipient.students.length} Orang):*
${studentsText}

🔗 *Portal Manajemen Kelas Ustadzah:*
https://markaztikrar.id/muallimah/kelas-berbayar

*(Pesan otomatis dari Sistem Markaz Tikrar Indonesia).*

Jazaakillahu khairan katsiran atas dedikasi Ustadzah dalam membimbing para pecinta Al-Qur'an. Semoga Allah Ta'ala melimpahkan kesehatan, keberkahan, dan kemudahan untuk setiap sesi bimbingan hingga selesai. Aamiin.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
━━━━━━━━━━━━━━
Tim Akademik Markaz Tikrar Indonesia
🌐 https://markaztikrar.id`;
}

export async function ensurePaidClassReminderColumnsExist(): Promise<void> {
  try {
    await query(`
      ALTER TABLE public.muallimah_paid_classes
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS estimated_end_date DATE,
        ADD COLUMN IF NOT EXISTS reminder_h1_ustadzah_sent_at TIMESTAMPTZ;

      ALTER TABLE public.paid_class_registrations
        ADD COLUMN IF NOT EXISTS reminder_h1_sent_at TIMESTAMPTZ;
    `);
  } catch (err) {
    console.warn('[PaidClassReminder] Column check error:', err);
  }
}

export async function getH1PaidClassThalibahCandidates(
  targetDate: string
): Promise<PaidClassThalibahCandidate[]> {
  await ensurePaidClassReminderColumnsExist();

  const { rows } = await query(
    `SELECT
      r.id AS registration_id,
      r.paid_class_id,
      r.user_id,
      r.full_name,
      COALESCE(NULLIF(TRIM(r.whatsapp), ''), NULLIF(TRIM(u.whatsapp), '')) AS raw_phone,
      r.reminder_h1_sent_at,
      c.class_name,
      c.subject_material,
      c.schedule_day,
      c.time_start,
      c.time_end,
      COALESCE(c.timezone, 'WIB') AS timezone,
      c.duration_info,
      c.start_date::text AS start_date,
      c.estimated_end_date::text AS estimated_end_date,
      c.zoom_link,
      c.whatsapp_group_link,
      m.full_name AS ustadzah_name
    FROM public.paid_class_registrations r
    JOIN public.muallimah_paid_classes c ON c.id = r.paid_class_id
    JOIN public.users m ON m.id = c.muallimah_id
    LEFT JOIN public.users u ON u.id = r.user_id
    WHERE c.status IN ('approved', 'active')
      AND c.start_date = $1::date
      AND COALESCE(r.status, 'pending') NOT IN ('cancelled', 'rejected')
      AND (u.id IS NULL OR (u.is_blacklisted IS NOT TRUE AND u.is_active IS NOT FALSE))
    ORDER BY c.start_date ASC, c.time_start ASC, r.full_name ASC`,
    [targetDate]
  );

  return rows.map((r: any) => ({
    registrationId: r.registration_id,
    paidClassId: r.paid_class_id,
    userId: r.user_id || null,
    fullName: r.full_name,
    whatsapp: r.raw_phone || '',
    className: r.class_name,
    subjectMaterial: r.subject_material,
    ustadzahName: formatMuallimahName(r.ustadzah_name),
    scheduleDay: r.schedule_day,
    timeStart: r.time_start,
    timeEnd: r.time_end,
    timezone: r.timezone || 'WIB',
    durationInfo: r.duration_info,
    startDate: String(r.start_date).slice(0, 10),
    estimatedEndDate: r.estimated_end_date ? String(r.estimated_end_date).slice(0, 10) : null,
    zoomLink: r.zoom_link,
    whatsappGroupLink: r.whatsapp_group_link,
    alreadySent: Boolean(r.reminder_h1_sent_at),
    reminderSentAt: r.reminder_h1_sent_at,
  }));
}

export async function getH1PaidClassUstadzahCandidates(
  targetDate: string
): Promise<PaidClassUstadzahCandidate[]> {
  await ensurePaidClassReminderColumnsExist();

  const { rows } = await query(
    `SELECT
      c.id AS paid_class_id,
      c.muallimah_id,
      c.class_name,
      c.subject_material,
      c.schedule_day,
      c.time_start,
      c.time_end,
      COALESCE(c.timezone, 'WIB') AS timezone,
      c.duration_info,
      c.start_date::text AS start_date,
      c.estimated_end_date::text AS estimated_end_date,
      c.zoom_link,
      c.whatsapp_group_link,
      c.reminder_h1_ustadzah_sent_at,
      m.full_name AS ustadzah_name,
      NULLIF(TRIM(m.whatsapp), '') AS ustadzah_phone,
      r.id AS registration_id,
      r.full_name AS student_name,
      COALESCE(NULLIF(TRIM(r.whatsapp), ''), '') AS student_phone,
      COALESCE(r.status, 'pending') AS student_status
    FROM public.muallimah_paid_classes c
    JOIN public.users m ON m.id = c.muallimah_id
    LEFT JOIN public.paid_class_registrations r
      ON r.paid_class_id = c.id
      AND COALESCE(r.status, 'pending') NOT IN ('cancelled', 'rejected')
    WHERE c.status IN ('approved', 'active')
      AND c.start_date = $1::date
      AND (m.is_blacklisted IS NOT TRUE)
      AND (m.is_active IS NOT FALSE)
    ORDER BY c.time_start ASC, c.id, r.created_at ASC`,
    [targetDate]
  );

  const classMap = new Map<string, PaidClassUstadzahCandidate>();

  for (const row of rows) {
    let item = classMap.get(row.paid_class_id);
    if (!item) {
      item = {
        paidClassId: row.paid_class_id,
        muallimahId: row.muallimah_id,
        ustadzahName: formatMuallimahName(row.ustadzah_name),
        whatsapp: row.ustadzah_phone || '',
        className: row.class_name,
        subjectMaterial: row.subject_material,
        scheduleDay: row.schedule_day,
        timeStart: row.time_start,
        timeEnd: row.time_end,
        timezone: row.timezone || 'WIB',
        durationInfo: row.duration_info,
        startDate: String(row.start_date).slice(0, 10),
        estimatedEndDate: row.estimated_end_date ? String(row.estimated_end_date).slice(0, 10) : null,
        zoomLink: row.zoom_link,
        whatsappGroupLink: row.whatsapp_group_link,
        students: [],
        alreadySent: Boolean(row.reminder_h1_ustadzah_sent_at),
        reminderSentAt: row.reminder_h1_ustadzah_sent_at,
      };
      classMap.set(row.paid_class_id, item);
    }

    if (row.registration_id && row.student_name) {
      item.students.push({
        registrationId: row.registration_id,
        fullName: row.student_name,
        whatsapp: row.student_phone || '',
        status: row.student_status,
      });
    }
  }

  return Array.from(classMap.values());
}

export async function sendH1PaidClassThalibahReminders(
  options: SendH1PaidClassRemindersOptions = {}
): Promise<SendH1PaidClassThalibahResult> {
  const targetDate = options.targetDate || getTomorrowWibDateString();
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);

  if (!dryRun) {
    const { config: autoConfig } = await getWhatsAppAutoMessagesConfig();
    if (!autoConfig.reminder_kelas_berbayar_h1) {
      return {
        success: true,
        targetDate,
        dryRun,
        totalCandidates: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        stoppedEarly: true,
        stopReason: 'Pengingat otomatis H-1 Kelas Berbayar sedang dinonaktifkan oleh Admin di /admin/whatsapp',
        results: [],
      };
    }
  }

  const candidates = await getH1PaidClassThalibahCandidates(targetDate);
  const toProcess = force ? candidates : candidates.filter(c => !c.alreadySent);

  const results: SendH1PaidClassThalibahResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let stoppedEarly = false;
  let stopReason: string | null = null;
  let consecutiveGatewayErrors = 0;

  if (!dryRun && toProcess.length > 0) {
    const waStatus = await whatsappService.getStatus();
    if (!waStatus.configured || !waStatus.watzap?.isConnected) {
      return {
        success: true,
        targetDate,
        dryRun,
        totalCandidates: candidates.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount: candidates.length,
        stoppedEarly: true,
        stopReason: !waStatus.configured
          ? 'WatZap belum dikonfigurasi'
          : 'Instance WhatsApp sedang offline/terputus — reminder thalibah kelas berbayar dibatalkan',
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
        className: item.className,
        whatsapp: item.whatsapp,
        success: false,
        error: 'Nomor WhatsApp thalibah tidak valid atau kosong',
      });
      continue;
    }

    const messageText = buildH1PaidClassThalibahMessage({
      fullName: item.fullName,
      className: item.className,
      subjectMaterial: item.subjectMaterial,
      ustadzahName: item.ustadzahName,
      scheduleDay: item.scheduleDay,
      timeStart: item.timeStart,
      timeEnd: item.timeEnd,
      timezone: item.timezone,
      durationInfo: item.durationInfo,
      startDateFormatted: formatIndonesianDate(item.startDate),
      estimatedEndDateFormatted: item.estimatedEndDate
        ? formatIndonesianDate(item.estimatedEndDate)
        : null,
      zoomLink: item.zoomLink,
      whatsappGroupLink: item.whatsappGroupLink,
    });

    if (dryRun) {
      sentCount++;
      results.push({
        registrationId: item.registrationId,
        fullName: item.fullName,
        className: item.className,
        whatsapp: formattedPhone,
        success: true,
        messageId: `dry_run_${item.registrationId}`,
      });
      continue;
    }

    try {
      const sendRes = await whatsappService.sendTextMessage(formattedPhone, messageText, { sourceTag: 'cron_kelas_berbayar' });
      if (sendRes.success) {
        sentCount++;
        consecutiveGatewayErrors = 0;
        await query(
          `UPDATE public.paid_class_registrations SET reminder_h1_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [item.registrationId]
        );
        results.push({
          registrationId: item.registrationId,
          fullName: item.fullName,
          className: item.className,
          whatsapp: formattedPhone,
          success: true,
          messageId: sendRes.messageId,
        });
      } else {
        failedCount++;
        results.push({
          registrationId: item.registrationId,
          fullName: item.fullName,
          className: item.className,
          whatsapp: formattedPhone,
          success: false,
          error: sendRes.error || 'Gagal mengirim WhatsApp ke thalibah',
        });

        const errClass = classifyWhatsAppError(sendRes.error, {
          rateLimited: sendRes.rateLimited,
          fatalInstanceError: sendRes.fatalInstanceError,
        });
        if (errClass.shouldStopBatch) {
          stoppedEarly = true;
          stopReason = sendRes.error || 'Reminder dihentikan karena rate-limit / instance WatZap error';
          break;
        }
        if (sendRes.provider !== 'none') {
          consecutiveGatewayErrors++;
          if (consecutiveGatewayErrors >= 3) {
            stoppedEarly = true;
            stopReason = `Reminder dihentikan setelah ${consecutiveGatewayErrors} kegagalan gateway berturut-turut`;
            break;
          }
        }
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        registrationId: item.registrationId,
        fullName: item.fullName,
        className: item.className,
        whatsapp: formattedPhone,
        success: false,
        error: err.message,
      });
      consecutiveGatewayErrors++;
      if (consecutiveGatewayErrors >= 3) {
        stoppedEarly = true;
        stopReason = `Reminder dihentikan setelah ${consecutiveGatewayErrors} exception berturut-turut`;
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
    totalCandidates: candidates.length,
    sentCount,
    failedCount,
    skippedCount: skippedCount + unreachedCount + (candidates.length - toProcess.length),
    stoppedEarly,
    stopReason,
    results,
  };
}

export async function sendH1PaidClassUstadzahReminders(
  options: SendH1PaidClassRemindersOptions = {}
): Promise<SendH1PaidClassUstadzahResult> {
  const targetDate = options.targetDate || getTomorrowWibDateString();
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);

  if (!dryRun) {
    const { config: autoConfig } = await getWhatsAppAutoMessagesConfig();
    if (!autoConfig.reminder_kelas_berbayar_h1) {
      return {
        success: true,
        targetDate,
        dryRun,
        totalClasses: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        stoppedEarly: true,
        stopReason: 'Pengingat otomatis H-1 Kelas Berbayar sedang dinonaktifkan oleh Admin di /admin/whatsapp',
        results: [],
      };
    }
  }

  const candidates = await getH1PaidClassUstadzahCandidates(targetDate);
  const toProcess = force ? candidates : candidates.filter(c => !c.alreadySent);

  const results: SendH1PaidClassUstadzahResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let stoppedEarly = false;
  let stopReason: string | null = null;
  let consecutiveGatewayErrors = 0;

  if (!dryRun && toProcess.length > 0) {
    const waStatus = await whatsappService.getStatus();
    if (!waStatus.configured || !waStatus.watzap?.isConnected) {
      return {
        success: true,
        targetDate,
        dryRun,
        totalClasses: candidates.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount: candidates.length,
        stoppedEarly: true,
        stopReason: !waStatus.configured
          ? 'WatZap belum dikonfigurasi'
          : 'Instance WhatsApp sedang offline/terputus — reminder ustadzah kelas berbayar dibatalkan',
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
        paidClassId: item.paidClassId,
        ustadzahName: item.ustadzahName,
        className: item.className,
        whatsapp: item.whatsapp,
        studentCount: item.students.length,
        success: false,
        error: 'Nomor WhatsApp ustadzah tidak valid atau kosong',
      });
      continue;
    }

    const messageText = buildH1PaidClassUstadzahMessage({
      ustadzahName: item.ustadzahName,
      className: item.className,
      subjectMaterial: item.subjectMaterial,
      scheduleDay: item.scheduleDay,
      timeStart: item.timeStart,
      timeEnd: item.timeEnd,
      timezone: item.timezone,
      durationInfo: item.durationInfo,
      startDateFormatted: formatIndonesianDate(item.startDate),
      estimatedEndDateFormatted: item.estimatedEndDate
        ? formatIndonesianDate(item.estimatedEndDate)
        : null,
      zoomLink: item.zoomLink,
      whatsappGroupLink: item.whatsappGroupLink,
      students: item.students,
    });

    if (dryRun) {
      sentCount++;
      results.push({
        paidClassId: item.paidClassId,
        ustadzahName: item.ustadzahName,
        className: item.className,
        whatsapp: formattedPhone,
        studentCount: item.students.length,
        success: true,
        messageId: `dry_run_${item.paidClassId}`,
      });
      continue;
    }

    try {
      const sendRes = await whatsappService.sendTextMessage(formattedPhone, messageText, { sourceTag: 'cron_kelas_berbayar' });
      if (sendRes.success) {
        sentCount++;
        consecutiveGatewayErrors = 0;
        await query(
          `UPDATE public.muallimah_paid_classes SET reminder_h1_ustadzah_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [item.paidClassId]
        );
        results.push({
          paidClassId: item.paidClassId,
          ustadzahName: item.ustadzahName,
          className: item.className,
          whatsapp: formattedPhone,
          studentCount: item.students.length,
          success: true,
          messageId: sendRes.messageId,
        });
      } else {
        failedCount++;
        results.push({
          paidClassId: item.paidClassId,
          ustadzahName: item.ustadzahName,
          className: item.className,
          whatsapp: formattedPhone,
          studentCount: item.students.length,
          success: false,
          error: sendRes.error || 'Gagal mengirim WhatsApp ke ustadzah',
        });

        const errClass = classifyWhatsAppError(sendRes.error, {
          rateLimited: sendRes.rateLimited,
          fatalInstanceError: sendRes.fatalInstanceError,
        });
        if (errClass.shouldStopBatch) {
          stoppedEarly = true;
          stopReason = sendRes.error || 'Reminder ustadzah dihentikan karena rate-limit / instance WatZap error';
          break;
        }
        if (sendRes.provider !== 'none') {
          consecutiveGatewayErrors++;
          if (consecutiveGatewayErrors >= 3) {
            stoppedEarly = true;
            stopReason = `Reminder ustadzah dihentikan setelah ${consecutiveGatewayErrors} kegagalan gateway berturut-turut`;
            break;
          }
        }
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        paidClassId: item.paidClassId,
        ustadzahName: item.ustadzahName,
        className: item.className,
        whatsapp: formattedPhone,
        studentCount: item.students.length,
        success: false,
        error: err.message,
      });
      consecutiveGatewayErrors++;
      if (consecutiveGatewayErrors >= 3) {
        stoppedEarly = true;
        stopReason = `Reminder ustadzah dihentikan setelah ${consecutiveGatewayErrors} exception berturut-turut`;
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
    totalClasses: candidates.length,
    sentCount,
    failedCount,
    skippedCount: skippedCount + unreachedCount + (candidates.length - toProcess.length),
    stoppedEarly,
    stopReason,
    results,
  };
}
