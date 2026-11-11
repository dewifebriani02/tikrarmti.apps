#!/usr/bin/env node
/**
 * Broadcast Official WhatsApp Number Announcement to Thalibah Batch 1-4
 * Excludes Blacklisted Users
 * Features:
 * - Deduplication by normalized phone number
 * - Rate limiting (1.5 - 2.5s delay between messages)
 * - Detailed logging and JSON output report
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Determine app directory & load .env.local
const APP_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(APP_DIR, '.env.local');

if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
const WATZAP_API_KEY = (process.env.WATZAP_API_KEY || '').trim();
const WATZAP_NUMBER_KEY = (process.env.WATZAP_NUMBER_KEY || '').trim();

if (!DATABASE_URL) {
  console.error('[ERROR] DATABASE_URL is not set.');
  process.exit(1);
}

if (!WATZAP_API_KEY || !WATZAP_NUMBER_KEY) {
  console.error('[ERROR] WATZAP_API_KEY or WATZAP_NUMBER_KEY is not set.');
  process.exit(1);
}

const MESSAGE_TEXT = `📢 *PENGUMUMAN RESMI: NOMOR PENGINGAT OTOMATIS APLIKASI MTI*

Assalamu'alaikum Warahmatullahi Wabarakatuh.

Ykh. Seluruh Thalibah Markaz Tikrar Indonesia (MTI)
(Batch 1, Batch 2, Batch 3, dan Calon Thalibah Batch 4),
Semoga Ukhti senantiasa dalam limpahan taufik, kesehatan, dan kemudahan dalam berinteraksi dengan Al-Qur'an.

Untuk meningkatkan kelancaran informasi dan layanan pembelajaran, kini Markaz Tikrar Indonesia memiliki nomor WhatsApp resmi khusus untuk *pengiriman notifikasi dan pengingat otomatis dari aplikasi web*:

📱 *Nomor Resmi Sistem MTI:*
👉 *0813-8884-240* (atau +628138884240)
_(Disarankan disimpan dengan nama: *MTI Notifikasi Otomatis*)_

━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *HAL-HAL PENTING YANG WAJIB DIPERHATIKAN:*
━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ *WAJIB MENYIMPAN (SAVE) NOMOR INI*
Seluruh thalibah dan pendaftar wajib segera menyimpan nomor *0813-8884-240* di kontak handphone masing-masing. Hal ini penting agar pesan pengingat tidak dianggap spam atau diblokir oleh WhatsApp, sehingga informasi penting selalu masuk dengan lancar.

2️⃣ *PUSAT PENGINGAT & NOTIFIKASI PEMBELAJARAN*
Nomor ini akan digunakan sebagai pusat pengiriman otomatis untuk:
• Pengingat jadwal halaqah & tashih
• Pengingat tasmi' & evaluasi ujian (lisan / tulis)
• Pengingat pengisian presensi & jurnal harian
• Update status pendaftaran dan akun

3️⃣ *JANGAN MEMBALAS PESAN INI (NO-REPLY)*
Pesan dari nomor ini dikirimkan otomatis oleh sistem aplikasi (bot broadcast), sehingga *pesan balasan/chat masuk ke nomor ini tidak akan terbaca oleh musyrifah maupun pengurus*.

━━━━━━━━━━━━━━━━━━━━━━━━━━

Bagi Ukhti yang memiliki pertanyaan, kendala teknis aplikasi, atau konfirmasi terkait halaqah, silakan tetap menghubungi *Musyrifah Halaqah masing-masing* atau *Admin Resmi MTI*.

Jazakillahu khairan atas perhatian, kerja sama, dan komitmen Ukhti bersama Markaz Tikrar Indonesia.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

*Markaz Tikrar Indonesia (MTI)*
🌐 https://markaztikrar.id`;

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 13) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWatZapMessage(phone, message) {
  try {
    const res = await fetch('https://api.watzap.id/v1/send_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MTI-Broadcast/1.0',
      },
      body: JSON.stringify({
        api_key: WATZAP_API_KEY,
        number_key: WATZAP_NUMBER_KEY,
        phone_no: phone,
        message: message,
      }),
    });

    const data = await res.json();
    const isOk =
      data.status === '200' ||
      data.status === 200 ||
      data.status === true ||
      data.ack === 'successfully';

    return {
      success: isOk,
      error: isOk ? null : data.message || JSON.stringify(data),
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network error',
    };
  }
}

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false,
  });

  console.log('====================================================');
  console.log('🚀 MTI WHATSAPP BROADCAST: OFFICIAL APPLICATION NUMBER');
  console.log('====================================================');

  try {
    // 1. Fetch blacklisted users
    console.log('[1/4] Mengambil daftar blacklist...');
    const blackRes = await pool.query(`
      SELECT DISTINCT LOWER(TRIM(email)) as email, 
             REGEXP_REPLACE(whatsapp, '[^0-9]', '', 'g') as phone
      FROM users 
      WHERE is_blacklisted = true
    `);

    const blacklistedEmails = new Set(
      blackRes.rows.map((r) => r.email).filter(Boolean)
    );
    const blacklistedPhones = new Set(
      blackRes.rows
        .map((r) => normalizePhoneNumber(r.phone))
        .filter(Boolean)
    );
    console.log(`=> Terdeteksi ${blackRes.rows.length} entri blacklist.`);

    // 2. Fetch candidates from Batch 1-4
    console.log('[2/4] Mengambil thalibah Batch 1-4...');
    const regRes = await pool.query(`
      SELECT 
        p.user_id,
        p.full_name,
        COALESCE(NULLIF(TRIM(p.wa_phone),''), NULLIF(TRIM(u.whatsapp),'')) as raw_phone,
        LOWER(TRIM(COALESCE(p.email, u.email))) as clean_email,
        b.name as batch_name,
        b.start_date
      FROM pendaftaran_tikrar_tahfidz p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN batches b ON p.batch_id = b.id
      WHERE p.batch_id IN (
        'ad42c2a8-3892-4861-847f-326e15790ac9',
        '4bcb3020-20cb-46e2-8be4-0100f8012a49',
        '2478b493-1b6b-412a-a05f-6193db815a43',
        'bf13c3d8-510b-47be-b5fa-aa3e825fce39'
      )
      AND (u.is_blacklisted IS FALSE OR u.is_blacklisted IS NULL)
      ORDER BY b.start_date ASC, p.created_at ASC
    `);

    // 3. Deduplicate and filter out blacklist
    console.log('[3/4] Melakukan deduplikasi dan eliminasi blacklist...');
    const seenPhones = new Set();
    const recipients = [];

    for (const row of regRes.rows) {
      const normPhone = normalizePhoneNumber(row.raw_phone);
      if (!normPhone || normPhone.length < 9) continue;

      if (blacklistedPhones.has(normPhone)) {
        console.log(`[SKIP BLACKLIST PHONE] ${row.full_name} (${normPhone})`);
        continue;
      }

      if (row.clean_email && blacklistedEmails.has(row.clean_email)) {
        console.log(`[SKIP BLACKLIST EMAIL] ${row.full_name} (${row.clean_email})`);
        continue;
      }

      if (seenPhones.has(normPhone)) {
        continue; // Already included
      }

      seenPhones.add(normPhone);
      recipients.push({
        fullName: row.full_name,
        phone: normPhone,
        batchName: row.batch_name,
      });
    }

    console.log(`=> Siap mengirim ke ${recipients.length} nomor WhatsApp unik.`);
    if (recipients.length === 0) {
      console.log('Tidak ada penerima.');
      await pool.end();
      return;
    }

    // 4. Send broadcast with rate limiting
    console.log('[4/4] Memulai pengiriman pesan massal...');
    const startTime = Date.now();
    let sentCount = 0;
    let failCount = 0;
    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const target = recipients[i];
      const seq = `[${i + 1}/${recipients.length}]`;

      const sendRes = await sendWatZapMessage(target.phone, MESSAGE_TEXT);

      if (sendRes.success) {
        sentCount++;
        console.log(`${seq} ✅ TERKIRIM: ${target.fullName} (+${target.phone}) [${target.batchName}]`);
        results.push({
          phone: target.phone,
          fullName: target.fullName,
          batchName: target.batchName,
          status: 'SUCCESS',
        });
      } else {
        failCount++;
        console.error(`${seq} ❌ GAGAL: ${target.fullName} (+${target.phone}) - Error: ${sendRes.error}`);
        results.push({
          phone: target.phone,
          fullName: target.fullName,
          batchName: target.batchName,
          status: 'FAILED',
          error: sendRes.error,
        });
      }

      // Random delay between 1500ms and 2200ms to stay within safe WhatsApp sending rhythm
      if (i < recipients.length - 1) {
        const delay = 1500 + Math.floor(Math.random() * 700);
        await sleep(delay);
      }
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log('====================================================');
    console.log('🎉 BROADCAST SELESAI!');
    console.log(`Durasi: ${durationSec} detik`);
    console.log(`Total: ${recipients.length}`);
    console.log(`Berhasil: ${sentCount}`);
    console.log(`Gagal: ${failCount}`);
    console.log('====================================================');

    // Save report file
    const reportPath = path.resolve(
      APP_DIR,
      `broadcast-official-number-${Date.now()}.json`
    );
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          durationSec,
          total: recipients.length,
          sentCount,
          failCount,
          results,
        },
        null,
        2
      )
    );
    console.log(`Laporan disimpan di: ${reportPath}`);

    await pool.end();
  } catch (err) {
    console.error('Fatal broadcast error:', err);
    await pool.end();
    process.exit(1);
  }
}

main();
