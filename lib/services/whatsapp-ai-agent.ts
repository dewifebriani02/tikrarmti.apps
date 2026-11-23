import { GoogleGenerativeAI, SchemaType, type Content, type FunctionDeclaration, type Part } from '@google/generative-ai';
import { randomInt } from 'crypto';
import { query, queryOne, transaction } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { whatsappService } from './whatsapp';
import { getWhatsAppAutoMessagesConfig } from './whatsapp-auto-settings';
import {
  getPhoneVariants,
  getWhatsAppBotConfig,
  setConversationBotEnabled,
  setConversationEscalation,
} from './whatsapp-chat';

const AI_SENDER_NAME = 'Asisten AI MTI';
const MAX_AI_REPLIES_PER_15_MIN = 10;
const OTP_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_CODES_PER_DAY = 10;
const GEMINI_MODEL_CANDIDATES = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];

async function generateContentWithFallback(
  genAI: GoogleGenerativeAI,
  systemInstruction: string,
  contents: Content[],
  lockedModel?: string
): Promise<{ result: Awaited<ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['generateContent']>>; modelName: string }> {
  const candidates = lockedModel ? [lockedModel, lockedModel] : GEMINI_MODEL_CANDIDATES;
  let lastErr: any;
  for (let i = 0; i < candidates.length; i++) {
    const modelName = candidates[i];
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        tools: [{ functionDeclarations: BOT_TOOLS }],
      });
      const result = await model.generateContent({ contents }, { timeout: 25000 });
      return { result, modelName };
    } catch (err: any) {
      lastErr = err;
      const status = err?.status;
      const msg = String(err?.message || '');
      const isTransient = status === 503 || status === 429 || msg.includes('503') || msg.includes('429') || msg.includes('abort') || msg.includes('timeout');
      console.warn(`[WhatsAppAI] Model ${modelName} attempt ${i + 1} failed (${status || msg})`);
      if (!isTransient && status && status < 500) {
        throw err;
      }
      if (isTransient && i < candidates.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastErr;
}

interface MatchedUserRow {
  id: string;
  email: string;
  full_name: string;
  nama_kunyah: string | null;
  whatsapp: string | null;
  role: string | null;
  student_id_number: string | null;
  is_active: boolean | null;
  is_blacklisted: boolean | null;
  blacklist_reason: string | null;
  has_password: boolean;
  avatar_url: string | null;
  must_change_password: boolean | null;
  batch_name: string | null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));
}

async function loadKnowledgeContext(): Promise<string> {
  try {
    const [faqRes, batchRes] = await Promise.all([
      query<{ category: string; questions: any }>(
        `SELECT category, questions FROM faqs ORDER BY sort_order ASC`
      ),
      query<{ name: string; status: string; start_date: string | null; registration_end_date: string | null }>(
        `SELECT name, status, start_date::text, registration_end_date::text
         FROM batches
         WHERE status IN ('open', 'ongoing')
         ORDER BY created_at DESC
         LIMIT 5`
      ),
    ]);

    const faqLines: string[] = [];
    for (const row of faqRes.rows) {
      const items = Array.isArray(row.questions) ? row.questions : [];
      if (items.length === 0) continue;
      faqLines.push(`\n[${row.category}]`);
      for (const item of items) {
        if (item?.q && item?.a) {
          faqLines.push(`- T: ${stripHtml(String(item.q))}\n  J: ${stripHtml(String(item.a))}`);
        }
      }
    }

    const batchLines = batchRes.rows.map(
      (b) =>
        `- ${b.name} (Status: ${b.status}${b.registration_end_date ? `, Tutup Daftar: ${b.registration_end_date.slice(0, 10)}` : ''})`
    );

    return [
      '=== BATCH AKTIF / TERBUKA SAAT INI ===',
      batchLines.length > 0 ? batchLines.join('\n') : '- Belum ada data batch open/ongoing.',
      '',
      '=== TAUTAN RESMI APLIKASI MTI ===',
      '- Login: https://markaztikrar.id/login',
      '- Lupa Password / Minta OTP: https://markaztikrar.id/lupa-password',
      '- Verifikasi OTP Reset Password: https://markaztikrar.id/verifikasi-otp',
      '- Pendaftaran Program: https://markaztikrar.id/pendaftaran',
      '- Jurnal Harian: https://markaztikrar.id/jurnal-harian',
      '- Murojaah 40x: https://markaztikrar.id/murojaah',
      '- Daftar Ulang: https://markaztikrar.id/daftar-ulang',
      '- Halaman FAQ: https://markaztikrar.id/faq',
      '',
      '=== FAQ RESMI MARKAZ TIKRAR INDONESIA ===',
      faqLines.join('\n'),
    ].join('\n');
  } catch (err) {
    console.warn('[WhatsAppAI] Failed to load knowledge context:', err);
    return 'Tautan Login: https://markaztikrar.id/login | Lupa Password: https://markaztikrar.id/lupa-password';
  }
}

async function findAccountsByPhone(phoneNumber: string): Promise<MatchedUserRow[]> {
  const { canonical, local } = getPhoneVariants(phoneNumber);
  if (!canonical) return [];

  const res = await query<MatchedUserRow>(
    `SELECT
       u.id,
       u.email,
       u.full_name,
       u.nama_kunyah,
       u.whatsapp,
       u.role,
       u.student_id_number,
       u.is_active,
       u.is_blacklisted,
       u.blacklist_reason,
       (u.password_hash IS NOT NULL AND u.password_hash <> '') AS has_password,
       u.avatar_url,
       u.must_change_password,
       b.name AS batch_name
     FROM users u
     LEFT JOIN batches b ON b.id = u.current_tikrar_batch_id
     WHERE regexp_replace(COALESCE(u.whatsapp, ''), '[^0-9]', '', 'g') IN ($1, $2)
     ORDER BY u.created_at DESC
     LIMIT 5`,
    [canonical, local]
  );

  return res.rows;
}

async function executeDiagnoseLoginIssue(
  senderPhone: string,
  args: { reported_email?: string }
): Promise<Record<string, any>> {
  const accounts = await findAccountsByPhone(senderPhone);
  const reportedEmail = args.reported_email?.toLowerCase().trim();

  if (accounts.length === 0) {
    // Fallback: check pendaftaran_tikrar_tahfidz in case WA exists only in form
    const { canonical, local } = getPhoneVariants(senderPhone);
    const regRow = await queryOne<{ full_name: string; status: string; user_id: string | null }>(
      `SELECT full_name, status, user_id
       FROM pendaftaran_tikrar_tahfidz
       WHERE regexp_replace(COALESCE(wa_phone, ''), '[^0-9]', '', 'g') IN ($1, $2)
       ORDER BY created_at DESC
       LIMIT 1`,
      [canonical, local]
    );

    let reportedEmailExists = false;
    if (reportedEmail) {
      const emailCheck = await queryOne<{ id: string }>(
        `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [reportedEmail]
      );
      reportedEmailExists = Boolean(emailCheck);
    }

    return {
      found_by_phone: false,
      has_pendaftaran_record: Boolean(regRow),
      pendaftaran_status: regRow?.status || null,
      reported_email_provided: Boolean(reportedEmail),
      reported_email_registered_in_system: reportedEmail ? reportedEmailExists : null,
      diagnosis:
        'Nomor WhatsApp pengirim belum terhubung ke data user di tabel users. Kemungkinan thalibah memakai nomor WA baru, belum mendaftar akun, atau nomor WA di profil berbeda.',
      recommended_action:
        'Tanyakan email yang digunakan saat mendaftar atau arahkan untuk eskalasi ke admin jika nomor WA berubah/akun tidak ditemukan.',
    };
  }

  const accountSummaries = accounts.map((acc) => {
    const usesGoogle = Boolean(acc.avatar_url?.includes('googleusercontent')) || !acc.has_password;
    const isEmailMatch = reportedEmail ? acc.email.toLowerCase() === reportedEmail : null;

    let loginGuidance = '';
    if (acc.is_blacklisted) {
      loginGuidance = 'Akun dalam status blacklist. Wajib eskalasi ke Admin MTI.';
    } else if (acc.is_active === false) {
      loginGuidance = 'Akun sedang nonaktif. Wajib eskalasi ke Admin MTI.';
    } else if (!acc.has_password) {
      loginGuidance =
        'Akun terdaftar via Google (belum memiliki password manual). Thalibah harus klik tombol "Masuk dengan Google" menggunakan email tersebut, atau buat password baru lewat menu Lupa Password.';
    } else if (usesGoogle) {
      loginGuidance =
        'Akun bisa masuk menggunakan tombol "Masuk dengan Google" ATAU menggunakan Email + Password (jika lupa password, bisa minta kode OTP reset password).';
    } else {
      loginGuidance =
        'Akun menggunakan Email + Password. Jika lupa password, tawarkan untuk mengirimkan kode OTP reset password ke email terdaftarnya.';
    }

    return {
      full_name: acc.full_name,
      masked_email: maskEmail(acc.email),
      email_matches_reported: isEmailMatch,
      student_id_number: acc.student_id_number,
      batch_name: acc.batch_name,
      is_active: acc.is_active !== false,
      is_blacklisted: Boolean(acc.is_blacklisted),
      has_password_set: acc.has_password,
      recommended_login_method: !acc.has_password ? 'Google OAuth' : usesGoogle ? 'Google OAuth / Email+Password' : 'Email+Password',
      must_change_password: Boolean(acc.must_change_password),
      guidance: loginGuidance,
    };
  });

  // Check if user provided a different email that exists under ANOTHER phone
  let reportedEmailMismatchNote: string | null = null;
  if (reportedEmail && !accounts.some((a) => a.email.toLowerCase() === reportedEmail)) {
    const otherAcc = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [reportedEmail]
    );
    if (otherAcc) {
      reportedEmailMismatchNote =
        'Email yang disebutkan thalibah ADA di sistem, tetapi terhubung ke nomor WA berbeda (indikasi akun ganda atau salah email saat login).';
    } else {
      reportedEmailMismatchNote =
        'Email yang disebutkan thalibah TIDAK terdaftar di sistem; akun aslinya memakai email yang terdeteksi dari nomor WA ini.';
    }
  }

  return {
    found_by_phone: true,
    duplicate_accounts_on_same_phone: accounts.length > 1,
    accounts: accountSummaries,
    reported_email_note: reportedEmailMismatchNote,
  };
}

async function executeSendPasswordResetOtp(
  senderPhone: string,
  args: { target_email_hint?: string }
): Promise<Record<string, any>> {
  const accounts = await findAccountsByPhone(senderPhone);
  if (accounts.length === 0) {
    return {
      success: false,
      reason: 'PHONE_NOT_REGISTERED',
      message:
        'Nomor WhatsApp pengirim tidak terdaftar di sistem, sehingga demi keamanan sistem tidak bisa mengirim OTP reset password secara otomatis. Silakan eskalasi ke admin jika thalibah ganti nomor WA.',
    };
  }

  let targetAccount = accounts[0];
  if (accounts.length > 1 && args.target_email_hint) {
    const hint = args.target_email_hint.toLowerCase().trim();
    const matched = accounts.find((a) => a.email.toLowerCase() === hint);
    if (matched) targetAccount = matched;
  }

  if (targetAccount.is_blacklisted || targetAccount.is_active === false) {
    return {
      success: false,
      reason: 'ACCOUNT_RESTRICTED',
      message: 'Akun dalam status nonaktif/blacklist. Harus ditangani oleh Admin MTI.',
    };
  }

  const normalizedEmail = targetAccount.email.toLowerCase().trim();
  const masked = maskEmail(normalizedEmail);

  // Check cooldown & hourly/daily caps identical to /api/auth/request-otp
  const usage = await queryOne<{ recent: string; last_hour: string; last_day: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE created_at > NOW() - make_interval(secs => $2)) AS recent,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS last_hour,
       COUNT(*) AS last_day
     FROM password_reset_otps
     WHERE email = $1 AND created_at > NOW() - INTERVAL '1 day'`,
    [normalizedEmail, RESEND_COOLDOWN_SECONDS]
  );

  if (Number(usage?.recent) > 0) {
    return {
      success: false,
      reason: 'COOLDOWN',
      masked_email: masked,
      message: 'Kode OTP baru saja dikirim kurang dari 1 menit yang lalu. Minta thalibah cek inbox/spam email terlebih dahulu.',
    };
  }

  if (Number(usage?.last_hour) >= MAX_CODES_PER_HOUR || Number(usage?.last_day) >= MAX_CODES_PER_DAY) {
    return {
      success: false,
      reason: 'RATE_LIMITED',
      masked_email: masked,
      message: 'Batas pengiriman OTP untuk akun ini sudah tercapai sementara. Silakan tunggu beberapa waktu atau eskalasi ke admin.',
    };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  await query('UPDATE password_reset_otps SET used = true WHERE email = $1 AND used = false', [
    normalizedEmail,
  ]);
  await query(
    `INSERT INTO password_reset_otps (email, code, expires_at)
     VALUES ($1, $2, NOW() + make_interval(mins => $3))`,
    [normalizedEmail, code, OTP_TTL_MINUTES]
  );

  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
  const name = targetAccount.full_name || 'Ukhti';
  const emailSent = await sendEmail({
    to: normalizedEmail,
    subject: 'Kode Reset Password - Markaz Tikrar Indonesia',
    text: `Assalamu'alaikum ${name},\n\nKode reset password Ukhti: ${formattedCode}\nBerlaku ${OTP_TTL_MINUTES} menit. Abaikan email ini jika Ukhti tidak meminta reset password.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p>Assalamu'alaikum ${escapeHtml(name)},</p>
        <p>Kode reset password Ukhti:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #15803d;">${formattedCode}</p>
        <p>Kode berlaku ${OTP_TTL_MINUTES} menit.</p>
        <p style="color: #6b7280; font-size: 13px;">Abaikan email ini jika Ukhti tidak meminta reset password.</p>
      </div>`,
  });

  if (!emailSent) {
    return {
      success: false,
      reason: 'EMAIL_SEND_FAILED',
      masked_email: masked,
      message: 'Sistem gagal mengirim email OTP melalui penyedia email. Sebaiknya eskalasi ke admin untuk reset manual.',
    };
  }

  return {
    success: true,
    masked_email: masked,
    expires_in_minutes: OTP_TTL_MINUTES,
    verification_url: 'https://markaztikrar.id/verifikasi-otp',
    message: `Kode OTP 6 digit berhasil dikirim ke email terdaftar (${masked}). Berlaku 15 menit.`,
  };
}

async function executeCheckThalibahStatus(senderPhone: string): Promise<Record<string, any>> {
  const accounts = await findAccountsByPhone(senderPhone);
  if (accounts.length === 0) {
    return {
      found: false,
      message: 'Nomor WhatsApp pengirim belum terdaftar sebagai user di sistem MTI.',
    };
  }

  const user = accounts[0];
  const [regRow, daftarUlangRow, halaqahRow, murojaahRows] = await Promise.all([
    queryOne<{ status: string; selection_status: string | null; chosen_juz: string | null; batch_name: string | null }>(
      `SELECT p.status, p.selection_status, p.chosen_juz, b.name AS batch_name
       FROM pendaftaran_tikrar_tahfidz p
       LEFT JOIN batches b ON b.id = p.batch_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [user.id]
    ),
    queryOne<{ status: string; confirmed_chosen_juz: string | null }>(
      `SELECT status, confirmed_chosen_juz
       FROM daftar_ulang_submissions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    ),
    queryOne<{ halaqah_name: string; status: string }>(
      `SELECT h.name AS halaqah_name, hs.status
       FROM halaqah_students hs
       JOIN halaqah h ON h.id = hs.halaqah_id
       WHERE hs.thalibah_id = $1 AND hs.status = 'active'
       ORDER BY hs.assigned_at DESC
       LIMIT 1`,
      [user.id]
    ),
    query<{ juz_code: string; total_completed: number; status: string; expires_at: string | null }>(
      `SELECT juz_code, total_completed, status, expires_at::text
       FROM murojaah_40x_progress
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 3`,
      [user.id]
    ),
  ]);

  return {
    found: true,
    full_name: user.full_name,
    student_id_number: user.student_id_number,
    current_batch: user.batch_name,
    latest_registration: regRow || null,
    daftar_ulang: daftarUlangRow || null,
    active_halaqah: halaqahRow || null,
    active_murojaah_40x: murojaahRows.rows.map((r) => ({
      juz_code: r.juz_code,
      completed_rounds: r.total_completed,
      target_rounds: 40,
      status: r.status,
      expires_at: r.expires_at,
    })),
  };
}

async function executeEscalateToAdmin(
  conversationId: string,
  senderPhone: string,
  displayName: string,
  args: { reason: string; summary: string; pause_bot?: boolean },
  adminPhones: string[]
): Promise<Record<string, any>> {
  const fullReason = `${args.reason}: ${args.summary}`.slice(0, 500);
  await setConversationEscalation(conversationId, true, fullReason);

  const shouldPause = args.pause_bot !== false;
  if (shouldPause) {
    await setConversationBotEnabled(conversationId, false);
  }

  // Optional WhatsApp notification to configured admin phones (gated by auto-message toggle)
  const { config: autoConfig } = await getWhatsAppAutoMessagesConfig();
  const notifiedAdmins: string[] = [];
  if (autoConfig.ai_escalation_admin_alert) {
    for (const adminPhone of adminPhones) {
    if (!adminPhone) continue;
    try {
      const alertText =
        `🔔 *Eskalasi Chat WhatsApp MTI*\n\n` +
        `• *Pengirim*: ${displayName} (+${senderPhone})\n` +
        `• *Kategori*: ${args.reason}\n` +
        `• *Ringkasan*: ${args.summary}\n\n` +
        `Balas langsung di Live Chat Inbox:\nhttps://markaztikrar.id/admin/whatsapp`;
      const res = await whatsappService.sendTextMessage(adminPhone, alertText, { sourceTag: 'ai_escalation', recipientName: 'Admin MTI' });
      if (res.success) notifiedAdmins.push(adminPhone);
    } catch (err) {
      console.warn('[WhatsAppAI] Failed notifying admin phone:', adminPhone, err);
    }
    }
  }

  return {
    escalated: true,
    bot_paused: shouldPause,
    notified_admin_count: notifiedAdmins.length,
    message: 'Percakapan telah ditandai "Butuh Admin" di Live Chat Inbox dan diteruskan ke tim Admin MTI.',
  };
}

const BOT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'diagnose_login_issue',
    description:
      'Mengecek status akun, metode login (Google atau Email+Password), email terdaftar (ter-masking), serta mendeteksi akun ganda/blacklist/nonaktif berdasarkan nomor WhatsApp pengirim.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reported_email: {
          type: SchemaType.STRING,
          description: 'Email yang disebutkan atau dicoba oleh pengirim (opsional).',
        },
      },
    },
  },
  {
    name: 'send_password_reset_otp',
    description:
      'Mengirimkan kode OTP 6 digit untuk reset/pembuatan password ke email akun yang terhubung dengan nomor WhatsApp pengirim. Hanya panggil jika pengirim mengalami lupa password atau akun Google belum memiliki password dan ingin login dengan email+password.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        target_email_hint: {
          type: SchemaType.STRING,
          description: 'Email tujuan jika pengirim memiliki lebih dari satu akun.',
        },
      },
    },
  },
  {
    name: 'check_thalibah_status',
    description:
      'Mengecek ringkasan data akademik pengirim (NIT, batch aktif, status pendaftaran/daftar ulang, halaqah aktif, dan progres Murojaah 40x) berdasarkan nomor WhatsApp pengirim.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'escalate_to_admin',
    description:
      'Menandai percakapan sebagai "Butuh Admin" di Live Chat Inbox Admin MTI dan menjeda bot sementara agar admin manusia bisa menangani. Panggil tool ini jika: (1) thalibah ganti nomor WA / akun tidak ditemukan, (2) akun ter-blacklist/nonaktif/ganda, (3) email OTP gagal terkirim atau thalibah lupa akses emailnya, (4) pertanyaan di luar cakupan FAQ/teknis yang butuh tindakan manual admin, atau (5) pengirim minta berbicara dengan admin.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: {
          type: SchemaType.STRING,
          description: 'Kategori singkat masalah (misal: Ganti Nomor WA, Akun Nonaktif, Pertanyaan Khusus, Bug Sistem, Minta Admin).',
        },
        summary: {
          type: SchemaType.STRING,
          description: 'Ringkasan diagnosa dan hal yang perlu ditindaklanjuti oleh Admin MTI.',
        },
        pause_bot: {
          type: SchemaType.BOOLEAN,
          description: 'Apakah bot dijeda agar admin membalas manual (default true).',
        },
      },
      required: ['reason', 'summary'],
    },
  },
];

export async function handleIncomingAiReply(params: {
  conversationId: string;
  phoneNumber: string;
  messageBody: string;
  botEnabled: boolean;
  hasMedia?: boolean;
}): Promise<{ replied: boolean; reason?: string }> {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
    if (!apiKey) {
      return { replied: false, reason: 'GOOGLE_AI_API_KEY not configured' };
    }

    if (!params.botEnabled) {
      return { replied: false, reason: 'Bot paused for this conversation' };
    }

    const config = await getWhatsAppBotConfig();
    if (!config.enabled) {
      return { replied: false, reason: 'Global WhatsApp AI bot is disabled' };
    }

    // Rate limit per conversation to avoid reply loops / spam
    const rateCheck = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt
       FROM whatsapp_messages
       WHERE conversation_id = $1
         AND direction = 'outbound'
         AND sender_name = $2
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [params.conversationId, AI_SENDER_NAME]
    );

    if (Number(rateCheck?.cnt || 0) >= MAX_AI_REPLIES_PER_15_MIN) {
      console.warn('[WhatsAppAI] Rate limit hit for conversation:', params.conversationId);
      return { replied: false, reason: 'Conversation AI rate limit reached' };
    }

    const conv = await queryOne<{ display_name: string }>(
      `SELECT display_name FROM whatsapp_conversations WHERE id = $1`,
      [params.conversationId]
    );
    const displayName = conv?.display_name || `+${params.phoneNumber}`;

    // Load recent conversation history + knowledge base + sender quick match
    const [historyRes, knowledgeContext, matchedUsers] = await Promise.all([
      query<{ direction: string; message_body: string; sender_name: string | null }>(
        `SELECT direction, message_body, sender_name
         FROM whatsapp_messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT 8`,
        [params.conversationId]
      ),
      loadKnowledgeContext(),
      findAccountsByPhone(params.phoneNumber),
    ]);

    const historyLines = historyRes.rows
      .reverse()
      .map((m) => {
        const who = m.direction === 'inbound' ? 'Pengirim' : m.sender_name || 'Admin';
        return `${who}: ${m.message_body}`;
      })
      .join('\n');

    const senderIdentitySummary =
      matchedUsers.length > 0
        ? `Nomor WA pengirim (+${params.phoneNumber}) TERDAFTAR atas nama: ${matchedUsers.map((u) => u.full_name).join(', ')} (${matchedUsers.length} akun).`
        : `Nomor WA pengirim (+${params.phoneNumber}) BELUM TERDAFTAR di tabel users.`;

    const systemInstruction = `Kamu adalah *Asisten AI Resmi Markaz Tikrar Indonesia (MTI)* di WhatsApp.
Tugasmu melayani calon thalibah, thalibah aktif, maupun pengurus dengan ramah, sopan, islami (awali salam jika pesan awal, gunakan sapaan "Ukhti"), ringkas, dan akurat sesuai format WhatsApp (WAJIB gunakan *tebal* dengan SATU tanda bintang, JANGAN gunakan **dua bintang** atau backtick, gunakan bullet poin rapi, hindari markdown heading # atau tabel).

ATURAN KETAT:
1. JAWAB BERDASARKAN DATA: Untuk informasi program, syarat, jadwal, metode tikrar, dan FAQ, gunakan HANYA informasi dari Knowledge Base di bawah. Jangan pernah mengarang aturan/jadwal/biaya baru.
2. KENDALA LOGIN / AKUN: Jika pengirim mengeluh gagal login, lupa email, lupa password, error masuk, atau akun bermasalah, SELALU panggil tool \`diagnose_login_issue\` terlebih dahulu sebelum memberi saran!
3. RESET PASSWORD / OTP: Jika dari hasil diagnosa akun valid dan pengirim lupa password atau butuh buat password baru, tawarkan atau langsung panggil \`send_password_reset_otp\` (jika pengirim memang minta reset/lupa password) lalu berikan instruksi jelas ke https://markaztikrar.id/verifikasi-otp. JANGAN pernah mengarang kode OTP.
4. DATA AKADEMIK: Jika pengirim bertanya status pendaftaran, halaqah, NIT, atau progres Murojaah 40x miliknya, panggil \`check_thalibah_status\`.
5. ESKALASI KE ADMIN: Jika menemukan akun nonaktif/blacklist, akun ganda, nomor WA tidak terdaftar padahal mengaku sudah daftar/ganti nomor, gagal kirim email OTP, keluhan bug teknis spesifik, atau pengirim minta berbicara dengan admin/pengurus, panggil \`escalate_to_admin\` dan sampaikan dengan ramah bahwa keluhannya telah diteruskan ke Admin MTI untuk ditindaklanjuti.
6. KEAMANAN: Jangan pernah menampilkan password hash, token rahasia, atau data milik nomor WA orang lain. Jika pengirim mengirim lampiran media/gambar tanpa keterangan jelas, minta Ukhti menjelaskan kendalanya secara singkat atau teruskan ke admin bila diperlukan.

${config.system_prompt_extra ? `INSTRUKSI TAMBAHAN DARI ADMIN:\n${config.system_prompt_extra}\n` : ''}
STATUS PENGIRIM SAAT INI:
${senderIdentitySummary}

${knowledgeContext}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const userPrompt = `RIWAYAT CHAT TERBARU:
${historyLines}

Pesan terakhir dari pengirim (${displayName}):
"${params.messageBody}"

Berikan balasan WhatsApp yang tepat, ramah, dan membantu.`;

    const contents: Content[] = [
      { role: 'user', parts: [{ text: userPrompt }] },
    ];

    const initialGen = await generateContentWithFallback(genAI, systemInstruction, contents);
    let result = initialGen.result;
    const activeModelName = initialGen.modelName;
    const toolsUsed: string[] = [];

    // Handle up to 4 tool-call rounds (preserving candidate content & thoughtSignature, using role: "user" for functionResponse)
    for (let step = 0; step < 4; step++) {
      const functionCalls = result.response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const modelContent = result.response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push({
          role: modelContent.role || 'model',
          parts: modelContent.parts || [],
        });
      } else {
        contents.push({
          role: 'model',
          parts: functionCalls.map((fc) => ({ functionCall: fc })),
        });
      }

      const functionResponseParts: Part[] = [];
      for (const call of functionCalls) {
        toolsUsed.push(call.name);
        let toolOutput: Record<string, any>;
        const args = (call.args || {}) as Record<string, any>;

        if (call.name === 'diagnose_login_issue') {
          toolOutput = await executeDiagnoseLoginIssue(params.phoneNumber, {
            reported_email: args.reported_email,
          });
        } else if (call.name === 'send_password_reset_otp') {
          toolOutput = await executeSendPasswordResetOtp(params.phoneNumber, {
            target_email_hint: args.target_email_hint,
          });
        } else if (call.name === 'check_thalibah_status') {
          toolOutput = await executeCheckThalibahStatus(params.phoneNumber);
        } else if (call.name === 'escalate_to_admin') {
          toolOutput = await executeEscalateToAdmin(
            params.conversationId,
            params.phoneNumber,
            displayName,
            {
              reason: String(args.reason || 'Butuh Bantuan Admin'),
              summary: String(args.summary || params.messageBody),
              pause_bot: args.pause_bot,
            },
            config.escalation_admin_phones
          );
        } else {
          toolOutput = { error: `Unknown tool ${call.name}` };
        }

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: toolOutput,
          },
        });
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });

      const nextGen = await generateContentWithFallback(genAI, systemInstruction, contents, activeModelName);
      result = nextGen.result;
    }

    const replyText = result.response.text()?.trim();
    if (!replyText) {
      return { replied: false, reason: 'Empty AI response' };
    }

    // Natural delay before replying
    if (config.auto_reply_delay_ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.auto_reply_delay_ms));
    }

    // Re-check if bot is still enabled (unless escalated during this turn which already paused after generating reply)
    const sendRes = await whatsappService.sendTextMessage(params.phoneNumber, replyText, { sourceTag: 'ai_bot' });
    if (!sendRes.success) {
      console.error('[WhatsAppAI] Failed to send WatZap reply:', sendRes.error);
      return { replied: false, reason: sendRes.error };
    }

    // Save AI reply to whatsapp_messages & update whatsapp_conversations
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO whatsapp_messages (
           conversation_id,
           phone_number,
           direction,
           message_body,
           status,
           sender_name,
           watzap_message_id,
           metadata,
           created_at
         )
         VALUES ($1, $2, 'outbound', $3, 'sent', $4, $5, $6, NOW())`,
        [
          params.conversationId,
          params.phoneNumber,
          replyText,
          AI_SENDER_NAME,
          sendRes.messageId || null,
          JSON.stringify({ is_ai_bot: true, tools_used: toolsUsed }),
        ]
      );

      await client.query(
        `UPDATE whatsapp_conversations
         SET last_message = $1,
             last_message_at = NOW(),
             last_message_direction = 'outbound',
             updated_at = NOW()
         WHERE id = $2`,
        [replyText, params.conversationId]
      );
    });

    return { replied: true };
  } catch (err: any) {
    console.error('[WhatsAppAI] Error in handleIncomingAiReply:', err);
    return { replied: false, reason: err?.message || 'AI agent error' };
  }
}
