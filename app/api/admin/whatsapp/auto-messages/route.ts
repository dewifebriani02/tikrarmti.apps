import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import {
  getWhatsAppAutoMessagesConfig,
  updateWhatsAppAutoMessagesConfig,
  type WhatsAppAutoMessageKey,
  type WhatsAppAutoMessagesConfig,
} from '@/lib/services/whatsapp-auto-settings';
import {
  getWhatsAppBotConfig,
  updateWhatsAppBotConfig,
} from '@/lib/services/whatsapp-chat';
import { buildMurojaahAfternoonReminder } from '@/lib/murojaah';
import {
  buildH1OralExamMessage,
  buildH1ExaminerOralExamMessage,
  buildWrittenExamOpenMessage,
  buildWrittenExamDeadlineMessage,
} from '@/lib/services/exam-reminder';
import {
  buildH1PaidClassThalibahMessage,
  buildH1PaidClassUstadzahMessage,
} from '@/lib/services/paid-class-reminder';

export const dynamic = 'force-dynamic';

export interface AutoMessageTemplateItem {
  key: WhatsAppAutoMessageKey;
  title: string;
  category: 'cron' | 'webhook';
  scheduleLabel: string;
  recipientLabel: string;
  description: string;
  disabledBehavior: string;
  sourceLabel: string;
  enabled: boolean;
  templatePreview: string;
}

const AUTO_KEYS: Array<keyof WhatsAppAutoMessagesConfig> = [
  'reminder_sore_murojaah',
  'reminder_ujian_lisan_thalibah',
  'reminder_ujian_lisan_examiner',
  'reminder_ujian_tulisan_dibuka',
  'reminder_ujian_tulisan_deadline',
  'reminder_kelas_berbayar_h1',
  'auto_reply_stop_opt_out',
  'ai_escalation_admin_alert',
];

function buildAutoMessageItems(
  autoConfig: WhatsAppAutoMessagesConfig,
  botEnabled: boolean,
  escalationPhonesCount: number
): AutoMessageTemplateItem[] {
  const murojaahPreview = buildMurojaahAfternoonReminder({
    userName: 'Fulanah binti Fulan',
    juzCode: '30',
    todayCount: 1,
    todayRemaining: 1,
    previousDebt: 2,
    totalDebt: 3,
    currentRound: 18,
    daysRemaining: 9,
  });

  const examThalibahPreview = buildH1OralExamMessage({
    fullName: 'Fulanah binti Fulan',
    batchName: 'Tikrar Tahfidz MTI Batch 3',
    examDateFormatted: 'Kamis, 19 November 2026',
    timeRangeFormatted: '16:00 – 17:00 WIB',
    examinerName: 'Najah Sungkar',
    targetJuz: '30',
    locationLink: 'https://zoom.us/j/contoh-ruang-ujian',
  });

  const examExaminerPreview = buildH1ExaminerOralExamMessage({
    examinerId: 'sample',
    examinerName: 'Ustadzah Najah Sungkar',
    whatsapp: '628123456789',
    examDate: '2026-11-19',
    examDateFormatted: 'Kamis, 19 November 2026',
    scheduleIds: ['sample'],
    alreadySent: false,
    totalStudents: 2,
    sessions: [
      {
        scheduleId: 'sample',
        batchName: 'Tikrar Tahfidz MTI Batch 3',
        startTime: '16:00:00',
        endTime: '17:00:00',
        timeRangeFormatted: '16:00 – 17:00 WIB',
        locationLink: 'https://zoom.us/j/contoh-ruang-ujian',
        alreadySent: false,
        students: [
          { registrationId: '1', userId: '1', fullName: 'Fulanah 1', targetJuz: '30A' },
          { registrationId: '2', userId: '2', fullName: 'Fulanah 2', targetJuz: '30B' },
        ],
      },
    ],
  });

  const writtenExamOpenPreview = buildWrittenExamOpenMessage({
    fullName: 'Fulanah binti Fulan',
    batchName: 'Tikrar Tahfidz MTI Batch 3',
    targetJuz: '30B',
    openDateTimeFormatted: 'Sabtu, 28 November 2026 pukul 00:00 WIB',
    closeDateTimeFormatted: 'Sabtu, 5 Desember 2026 pukul 00:00 WIB',
  });

  const writtenExamDeadlinePreview = buildWrittenExamDeadlineMessage({
    fullName: 'Fulanah binti Fulan',
    batchName: 'Tikrar Tahfidz MTI Batch 3',
    targetJuz: '30B',
    openDateTimeFormatted: 'Sabtu, 28 November 2026 pukul 00:00 WIB',
    closeDateTimeFormatted: 'Sabtu, 5 Desember 2026 pukul 00:00 WIB',
  });

  const paidClassPreview =
    `[UNTUK USTADZAH PENGAMPU]\n` +
    buildH1PaidClassUstadzahMessage({
      ustadzahName: 'Najah Sungkar',
      className: 'Bimbingan Tahsin Intensif & Talaqqi',
      subjectMaterial: 'Makharijul Huruf & Sifatul Huruf',
      scheduleDay: 'Senin & Kamis',
      timeStart: '05:30',
      timeEnd: '06:30',
      durationInfo: '8 Pekan (2 Bulan)',
      startDateFormatted: 'Senin, 1 Desember 2026',
      estimatedEndDateFormatted: 'Senin, 25 Januari 2027',
      zoomLink: 'https://zoom.us/j/contoh-kelas',
      whatsappGroupLink: 'https://chat.whatsapp.com/contoh-grup',
      students: [
        { registrationId: '1', fullName: 'Fulanah 1', whatsapp: '62812xxxxxxx', status: 'registered' },
      ],
    }) +
    `\n\n━━━━━━━━━━━━━━━━━━━━\n[UNTUK THALIBAH TERDAFTAR]\n` +
    buildH1PaidClassThalibahMessage({
      fullName: 'Fulanah binti Fulan',
      className: 'Bimbingan Tahsin Intensif & Talaqqi',
      subjectMaterial: 'Makharijul Huruf & Sifatul Huruf',
      ustadzahName: 'Najah Sungkar',
      scheduleDay: 'Senin & Kamis',
      timeStart: '05:30',
      timeEnd: '06:30',
      durationInfo: '8 Pekan (2 Bulan)',
      startDateFormatted: 'Senin, 1 Desember 2026',
      estimatedEndDateFormatted: 'Senin, 25 Januari 2027',
      zoomLink: 'https://zoom.us/j/contoh-kelas',
      whatsappGroupLink: 'https://chat.whatsapp.com/contoh-grup',
    });

  const stopOptOutPreview =
    `Wa'alaikumussalam warahmatullah. Pengingat sore Murojaah 40x melalui WhatsApp telah dinonaktifkan untuk akun Ukhti. Jika suatu saat ingin menyalakannya kembali, silakan buka menu Muraja'ah 40x di https://markaztikrar.id/murojaah.`;

  const escalationPreview =
    `🔔 *Eskalasi Chat WhatsApp MTI*\n\n` +
    `• *Pengirim*: Fulanah binti Fulan (+62812xxxxxxx)\n` +
    `• *Kategori*: Ganti Nomor WA / Bantuan Admin\n` +
    `• *Ringkasan*: Thalibah meminta bantuan admin untuk pembaruan data akun.\n\n` +
    `Balas langsung di Live Chat Inbox:\nhttps://markaztikrar.id/admin/whatsapp`;

  const aiAutoReplyPreview =
    `[Balasan Dinamis Berbasis Gemini AI + Knowledge Base FAQ & Status Akun]\n\n` +
    `Assalamu'alaikum warahmatullahi wabarakatuh Ukhti Fulanah 🌸\n` +
    `• Menjawab pertanyaan program, pendaftaran, jadwal, dan FAQ resmi MTI.\n` +
    `• Mendiagnosa kendala login & mengirim OTP reset password ke email terdaftar.\n` +
    `• Mengecek NIT, halaqah aktif, dan progres Murojaah 40x pengirim.`;

  return [
    {
      key: 'reminder_sore_murojaah',
      title: 'Pengingat Sore Murojaah 40x',
      category: 'cron',
      scheduleLabel: 'Cron Harian • 16:30 WIB',
      recipientLabel: 'Peserta Murojaah 40x aktif (sudah mulai > 0 putaran, bukan batch pendaftaran baru, < 2 putaran hari ini & belum STOP)',
      description:
        'Mengirim pengingat otomatis harian sore menjelang maghrib berisi rincian target hari ini, hutang putaran, dan tautan input murojaah.',
      disabledBehavior:
        'Jika dimatikan, cron pukul 16:30 WIB akan melewati pengiriman (0 pesan dikirim).',
      sourceLabel: 'lib/murojaah.ts → /api/cron/reminder-sore-murojaah',
      enabled: autoConfig.reminder_sore_murojaah,
      templatePreview: murojaahPreview,
    },
    {
      key: 'reminder_ujian_lisan_thalibah',
      title: 'Pengingat H-1 Ujian Lisan (Thalibah)',
      category: 'cron',
      scheduleLabel: 'Cron Harian • 09:00 WIB',
      recipientLabel: 'Thalibah yang dijadwalkan Ujian Akhir Lisan besok',
      description:
        'Mengirim jadwal H-1 Ujian Akhir Lisan (Tasmi’ Zoom), nama penguji, target juz, tautan Zoom, dan petunjuk persiapan ujian.',
      disabledBehavior:
        'Jika dimatikan, cron pukul 09:00 WIB tidak mengirim pesan H-1 ke thalibah.',
      sourceLabel: 'lib/services/exam-reminder.ts → buildH1OralExamMessage',
      enabled: autoConfig.reminder_ujian_lisan_thalibah,
      templatePreview: examThalibahPreview,
    },
    {
      key: 'reminder_ujian_lisan_examiner',
      title: 'Pengingat H-1 Ujian Lisan (Ustadzah Penguji)',
      category: 'cron',
      scheduleLabel: 'Cron Harian • 09:00 WIB',
      recipientLabel: 'Ustadzah penguji yang memiliki sesi Ujian Lisan besok',
      description:
        'Mengirim rekap H-1 sesi menguji beserta daftar nama thalibah, target juz, tautan Zoom, dan tautan input nilai untuk Ustadzah.',
      disabledBehavior:
        'Jika dimatikan, cron pukul 09:00 WIB tidak mengirim rekap jadwal ke Ustadzah penguji.',
      sourceLabel: 'lib/services/exam-reminder.ts → buildH1ExaminerOralExamMessage',
      enabled: autoConfig.reminder_ujian_lisan_examiner,
      templatePreview: examExaminerPreview,
    },
    {
      key: 'reminder_ujian_tulisan_dibuka',
      title: 'Notifikasi Pembukaan & Batas Akhir Ujian Tulisan (CBT)',
      category: 'cron',
      scheduleLabel: 'Cron Harian • 09:00 WIB (Hari Pembukaan Ujian Tulisan)',
      recipientLabel: 'Seluruh Thalibah aktif pada batch yang Ujian Akhir Tulisannya dibuka hari ini',
      description:
        'Mengirim pemberitahuan pembukaan Ujian Akhir Tulisan (CBT) lengkap dengan tanggal & jam dibuka, batas akhir penutupan ujian, serta tautan /ujian.',
      disabledBehavior:
        'Jika dimatikan, cron pukul 09:00 WIB tidak mengirim notifikasi pembukaan ujian tulisan otomatis.',
      sourceLabel: 'lib/services/exam-reminder.ts → buildWrittenExamOpenMessage',
      enabled: autoConfig.reminder_ujian_tulisan_dibuka,
      templatePreview: writtenExamOpenPreview,
    },
    {
      key: 'reminder_ujian_tulisan_deadline',
      title: 'Pengingat Batas Akhir Pengerjaan Ujian Tulisan (H-1 & Hari Terakhir)',
      category: 'cron',
      scheduleLabel: 'Cron Harian • 09:00 WIB (H-1 & Hari Penutupan Ujian Tulisan)',
      recipientLabel: 'Thalibah aktif yang BELUM menyelesaikan/submit Ujian Akhir Tulisan menjelang penutupan',
      description:
        'Mengirim pengingat batas akhir pengerjaan Ujian Akhir Tulisan khusus kepada thalibah yang belum submit ujian sebelum sesi ditutup.',
      disabledBehavior:
        'Jika dimatikan, cron pukul 09:00 WIB tidak mengirim pengingat batas akhir ujian tulisan otomatis.',
      sourceLabel: 'lib/services/exam-reminder.ts → buildWrittenExamDeadlineMessage',
      enabled: autoConfig.reminder_ujian_tulisan_deadline,
      templatePreview: writtenExamDeadlinePreview,
    },
    {
      key: 'reminder_kelas_berbayar_h1',
      title: 'Pengingat H-1 Mulai Kelas Berbayar (Ustadzah & Thalibah)',
      category: 'cron',
      scheduleLabel: 'Cron Harian • 08:30 WIB',
      recipientLabel: 'Ustadzah pengampu & seluruh Thalibah terdaftar untuk kelas berbayar yang mulai besok',
      description:
        'Mengirim pengingat otomatis H-1 sebelum tanggal mulai kelas berbayar berisi rincian jadwal, estimasi selesai, tautan Zoom & Grup WA, serta daftar peserta untuk Ustadzah.',
      disabledBehavior:
        'Jika dimatikan, cron pukul 08:30 WIB tidak mengirim pengingat H-1 kelas berbayar.',
      sourceLabel: 'lib/services/paid-class-reminder.ts → /api/cron/reminder-kelas-berbayar',
      enabled: autoConfig.reminder_kelas_berbayar_h1,
      templatePreview: paidClassPreview,
    },
    {
      key: 'auto_reply_stop_opt_out',
      title: 'Balasan Konfirmasi Opt-Out "STOP" (Murojaah)',
      category: 'webhook',
      scheduleLabel: 'Webhook Real-time • Saat thalibah balas STOP',
      recipientLabel: 'Thalibah yang membalas kata kunci STOP / stop reminder',
      description:
        'Mengirim pesan konfirmasi resmi (non-AI) setelah sistem menonaktifkan pengingat sore Murojaah 40x milik pengirim.',
      disabledBehavior:
        'Jika dimatikan, status pengingat di database tetap dinonaktifkan diam-diam tanpa mengirim balasan WA dan tanpa memicu AI.',
      sourceLabel: 'lib/services/whatsapp-chat.ts → handleMurojaahOptOut',
      enabled: autoConfig.auto_reply_stop_opt_out,
      templatePreview: stopOptOutPreview,
    },
    {
      key: 'ai_auto_reply',
      title: 'Asisten AI Auto-Reply WhatsApp',
      category: 'webhook',
      scheduleLabel: 'Webhook Real-time • Setiap pesan masuk',
      recipientLabel: 'Semua pengirim pesan masuk (kecuali STOP & chat yang dijeda)',
      description:
        'Balasan otomatis cerdas berbasis Gemini AI menggunakan FAQ resmi MTI, diagnosa login, OTP reset password, dan cek status thalibah. Tersinkron dengan tombol Asisten AI di Kotak Masuk.',
      disabledBehavior:
        'Jika dimatikan, pesan masuk hanya tersimpan di Kotak Masuk Admin tanpa balasan AI otomatis.',
      sourceLabel: 'lib/services/whatsapp-ai-agent.ts → handleIncomingAiReply',
      enabled: botEnabled,
      templatePreview: aiAutoReplyPreview,
    },
    {
      key: 'ai_escalation_admin_alert',
      title: 'Notifikasi WA Eskalasi AI ke Admin',
      category: 'webhook',
      scheduleLabel: 'Webhook Real-time • Saat AI eskalasi chat',
      recipientLabel:
        escalationPhonesCount > 0
          ? `${escalationPhonesCount} nomor admin penerima eskalasi di Setelan Bot`
          : 'Belum ada nomor admin eskalasi yang disetel di Kotak Masuk → Setelan Bot',
      description:
        'Mengirim pesan peringatan otomatis ke nomor WhatsApp Admin ketika Asisten AI menandai percakapan sebagai "Butuh Admin".',
      disabledBehavior:
        'Jika dimatikan, chat tetap ditandai "Butuh Admin" di Live Chat Inbox tanpa mengirim pesan WA ke admin.',
      sourceLabel: 'lib/services/whatsapp-ai-agent.ts → executeEscalateToAdmin',
      enabled: autoConfig.ai_escalation_admin_alert,
      templatePreview: escalationPreview,
    },
  ];
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const [{ config: autoConfig, updatedAt }, botConfig] = await Promise.all([
      getWhatsAppAutoMessagesConfig(),
      getWhatsAppBotConfig(),
    ]);

    const items = buildAutoMessageItems(
      autoConfig,
      botConfig.enabled,
      botConfig.escalation_admin_phones.length
    );

    return ApiResponses.success({
      config: {
        ...autoConfig,
        ai_auto_reply: botConfig.enabled,
      },
      updatedAt,
      items,
    });
  } catch (error: any) {
    console.error('[Admin WhatsApp Auto-Messages GET]', error);
    return ApiResponses.serverError(
      error.message || 'Gagal memuat pengaturan pesan otomatis WhatsApp'
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));

    const patchAuto: Partial<WhatsAppAutoMessagesConfig> = {};
    let nextAiEnabled: boolean | undefined = undefined;

    if (typeof body.enableAll === 'boolean') {
      for (const k of AUTO_KEYS) {
        patchAuto[k] = body.enableAll;
      }
      nextAiEnabled = body.enableAll;
    } else {
      for (const k of AUTO_KEYS) {
        if (typeof body[k] === 'boolean') {
          patchAuto[k] = body[k];
        }
      }
      if (typeof body.ai_auto_reply === 'boolean') {
        nextAiEnabled = body.ai_auto_reply;
      }
    }

    const [{ config: autoConfig, updatedAt }, botConfig] = await Promise.all([
      Object.keys(patchAuto).length > 0
        ? updateWhatsAppAutoMessagesConfig(patchAuto)
        : getWhatsAppAutoMessagesConfig(),
      nextAiEnabled !== undefined
        ? updateWhatsAppBotConfig({ enabled: nextAiEnabled })
        : getWhatsAppBotConfig(),
    ]);

    const items = buildAutoMessageItems(
      autoConfig,
      botConfig.enabled,
      botConfig.escalation_admin_phones.length
    );

    return ApiResponses.success(
      {
        config: {
          ...autoConfig,
          ai_auto_reply: botConfig.enabled,
        },
        updatedAt,
        items,
      },
      'Pengaturan pesan otomatis WhatsApp berhasil diperbarui'
    );
  } catch (error: any) {
    console.error('[Admin WhatsApp Auto-Messages PATCH]', error);
    return ApiResponses.serverError(
      error.message || 'Gagal memperbarui pengaturan pesan otomatis WhatsApp'
    );
  }
}
