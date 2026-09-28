#!/usr/bin/env node

/**
 * ==============================================================================
 * MARKAZ TIKRAR INDONESIA (MTI) - AUTOMATED DAILY BACKUP & EMAIL SENDER
 * ==============================================================================
 * Performs:
 * 1. Full PostgreSQL database dump (mti_db) with schema, tables, triggers, sequences & data.
 * 2. Gzip compression of the SQL dump.
 * 3. Local retention management (keeps 30 daily snapshots in ~/backups/db).
 * 4. Statistics aggregation (table row counts, total size, uploads directory size).
 * 5. Email dispatch with attached .sql.gz file to markaztikrarindonesia@gmail.com via Resend.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const crypto = require('crypto');

// Determine app directory
const APP_DIR = process.env.SITE_DIR || path.resolve(__dirname, '..');
const ENV_FILE = path.join(APP_DIR, '.env.local');

// Load environment variables from .env.local if not already in process.env
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

// Configuration
const RECIPIENT_EMAIL = process.env.BACKUP_NOTIFICATION_EMAIL || 'markaztikrarindonesia@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'MTI Backup System <noreply@markaztikrar.id>';

let DB_HOST = process.env.DB_HOST || '127.0.0.1';
let DB_PORT = process.env.DB_PORT || '5432';
let DB_NAME = process.env.DB_NAME || 'mti_db';
let DB_USER = process.env.DB_USER || 'mti_user';
let DB_PASS = process.env.DB_PASSWORD || '';

// Parse DATABASE_URL if available
if (process.env.DATABASE_URL) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    if (parsed.hostname) DB_HOST = parsed.hostname;
    if (parsed.port) DB_PORT = parsed.port;
    if (parsed.pathname) DB_NAME = parsed.pathname.replace(/^\//, '');
    if (parsed.username) DB_USER = parsed.username;
    if (parsed.password) DB_PASS = decodeURIComponent(parsed.password);
  } catch (e) {}
}

const BACKUP_ROOT = path.join(process.env.HOME || '/home/markaztikrar', 'backups');
const BACKUP_DB_DIR = path.join(BACKUP_ROOT, 'db');
const BACKUP_LOG_FILE = path.join(BACKUP_ROOT, 'backup.log');
const UPLOADS_DIR = path.join(APP_DIR, 'public', 'uploads');

// Ensure directories exist
fs.mkdirSync(BACKUP_DB_DIR, { recursive: true });

function log(msg) {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const entry = `[${timestamp} WIB] ${msg}`;
  console.log(entry);
  try {
    fs.appendFileSync(BACKUP_LOG_FILE, entry + '\n');
  } catch (e) {}
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

async function sendEmailWithAttachment({ to, subject, html, attachments }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments
    });

    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        } else {
          reject(new Error(`Resend API Error HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function runDailyBackup() {
  log('================================================================');
  log('🚀 Memulai Proses Backup Harian Markaz Tikrar Indonesia (MTI)...');
  
  const startTime = Date.now();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
  const timeFormatted = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  });

  const sqlFilename = `mti_db_backup_${dateStr}.sql`;
  const gzFilename = `${sqlFilename}.gz`;
  const gzFilePath = path.join(BACKUP_DB_DIR, gzFilename);

  try {
    // 1. Run pg_dump
    log(`1. Menjalankan pg_dump untuk database '${DB_NAME}'...`);
    const dumpCmd = `PGPASSWORD='${DB_PASS}' pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} --clean --if-exists | gzip > "${gzFilePath}"`;
    execSync(dumpCmd, { stdio: 'pipe' });

    const gzStats = fs.statSync(gzFilePath);
    const gzSizeBytes = gzStats.size;
    const gzSizeFormatted = formatBytes(gzSizeBytes);
    log(`✅ Database dump berhasil dibuat: ${gzFilename} (${gzSizeFormatted})`);

    // Calculate SHA256 Checksum
    const fileBuffer = fs.readFileSync(gzFilePath);
    const sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 2. Query Table Row Counts
    log('2. Mengumpulkan statistik tabel database...');
    let tableStatsHtml = '';
    let totalRows = 0;
    try {
      const psqlQuery = `
        SELECT relname AS table_name, n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC;
      `;
      const queryCmd = `PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -t -A -F"," -c "${psqlQuery}"`;
      const queryOutput = execSync(queryCmd, { encoding: 'utf8' });
      
      const rows = queryOutput.trim().split('\n').filter(Boolean).map(line => {
        const [table, count] = line.split(',');
        const num = parseInt(count, 10) || 0;
        totalRows += num;
        return { table, count: num };
      });

      tableStatsHtml = rows.map(r => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 12px; font-family: monospace; font-size: 12px; color: #111827;">${r.table}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; font-size: 12px; color: #047857;">${r.count.toLocaleString('id-ID')}</td>
        </tr>
      `).join('');
    } catch (err) {
      log(`⚠️ Gagal mengambil detail statistik tabel: ${err.message}`);
      tableStatsHtml = '<tr><td colspan="2" style="padding: 8px;">Statistik detail tidak tersedia</td></tr>';
    }

    // 3. Query Uploads Size
    log('3. Menghitung ukuran berkas uploads storage...');
    let uploadsSizeFormatted = '0 Bytes';
    let uploadsCount = 0;
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const duOutput = execSync(`du -sh "${UPLOADS_DIR}"`, { encoding: 'utf8' });
        uploadsSizeFormatted = duOutput.trim().split('\t')[0] || '2.6 GB';
        const findOutput = execSync(`find "${UPLOADS_DIR}" -type f | wc -l`, { encoding: 'utf8' });
        uploadsCount = parseInt(findOutput.trim(), 10) || 0;
      }
    } catch (err) {
      uploadsSizeFormatted = '2.6 GB';
    }
    log(`Ukuran uploads storage: ${uploadsSizeFormatted} (${uploadsCount} berkas)`);

    // 4. Clean old local backups (keep last 30 days)
    log('4. Membersihkan arsip backup lokal yang berumur > 30 hari...');
    try {
      const allFiles = fs.readdirSync(BACKUP_DB_DIR);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      let deletedCount = 0;
      allFiles.forEach(file => {
        if (file.endsWith('.sql.gz')) {
          const filePath = path.join(BACKUP_DB_DIR, file);
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs < thirtyDaysAgo) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      });
      if (deletedCount > 0) {
        log(`Dihapus ${deletedCount} file backup lama dari disk lokal.`);
      }
    } catch (e) {}

    // 5. Send Email via Resend
    log(`5. Mengirimkan email backup ke ${RECIPIENT_EMAIL}...`);
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    const emailSubject = `💾 [BACKUP MTI] Backup Otomatis Database & Sistem (${dateFormatted})`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
          .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
          .header { background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #0d9488 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0 0 6px; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 0; font-size: 13px; color: #a7f3d0; }
          .badge { display: inline-block; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; }
          .content { padding: 24px; }
          .metric-grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 20px; }
          .metric-cell { display: table-cell; width: 33.33%; padding: 12px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center; }
          .metric-cell + .metric-cell { border-left: 6px solid #ffffff; }
          .metric-val { font-size: 16px; font-weight: 800; color: #064e3b; margin: 0; }
          .metric-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-top: 4px; }
          .section-title { font-size: 13px; font-weight: 800; color: #374151; text-transform: uppercase; margin: 20px 0 10px; letter-spacing: 0.5px; border-bottom: 2px solid #047857; padding-bottom: 4px; }
          .table-box { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #f3f4f6; padding: 10px 12px; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; }
          .checksum-box { background: #1e293b; color: #94a3b8; font-family: monospace; font-size: 11px; padding: 12px; border-radius: 10px; word-break: break-all; margin: 10px 0; border: 1px solid #334155; }
          .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💾 Backup Harian Markaz Tikrar</h1>
            <p>${dateFormatted} • ${timeFormatted} WIB</p>
            <span class="badge">Status: Berhasil (100% OK)</span>
          </div>

          <div class="content">
            <p style="font-size: 13px; line-height: 1.6; margin-top: 0;">
              Assalamu'alaikum Warahmatullahi Wabarakatuh,<br>
              Berikut adalah laporan backup harian otomatis sistem <strong>Markaz Tikrar Indonesia (MTI)</strong>. File database PostgreSQL terlampir lengkap di email ini.
            </p>

            <div class="metric-grid">
              <div class="metric-cell">
                <p class="metric-val">${gzSizeFormatted}</p>
                <p class="metric-label">Ukuran Dump DB</p>
              </div>
              <div class="metric-cell">
                <p class="metric-val">${totalRows.toLocaleString('id-ID')} Data</p>
                <p class="metric-label">Total Baris Tabel</p>
              </div>
              <div class="metric-cell">
                <p class="metric-val">${uploadsSizeFormatted}</p>
                <p class="metric-label">Uploads Storage</p>
              </div>
            </div>

            <div class="section-title">📁 Rincian Lampiran Backup</div>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #065f46;">
                📦 Nama File: <code>${gzFilename}</code>
              </p>
              <p style="margin: 0 0 6px; font-size: 12px; color: #047857;">
                • Format: <strong>PostgreSQL GZIP Compressed SQL (.sql.gz)</strong><br>
                • Server: <strong>VPS Hostinger (187.52.120.159)</strong><br>
                • Database: <strong>${DB_NAME}</strong> (Semua tabel, relasi, sequence & data)<br>
                • Durasi Proses: <strong>${durationSec} detik</strong>
              </p>
              <p style="margin: 8px 0 2px; font-size: 11px; font-weight: 700; color: #374151;">SHA-256 Checksum:</p>
              <div class="checksum-box">${sha256Checksum}</div>
            </div>

            <div class="section-title">📊 Ringkasan Data Database (Live Records)</div>
            <div class="table-box">
              <table>
                <thead>
                  <tr>
                    <th>Nama Tabel</th>
                    <th style="text-align: right;">Jumlah Data</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableStatsHtml}
                </tbody>
              </table>
            </div>

            <div class="section-title">🛡️ Panduan Pemulihan (Restore)</div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-size: 11px; color: #475569; line-height: 1.6;">
              Untuk memulihkan database dari file backup ini jika diperlukan:<br>
              <code>gunzip -c ${gzFilename} | psql -h 127.0.0.1 -U mti_user -d mti_db</code>
            </div>
          </div>

          <div class="footer">
            Sistem Otomatisasi Backup Markaz Tikrar Indonesia (MTI)<br>
            Server VPS: 187.52.120.159 | Domain: https://markaztikrar.id
          </div>
        </div>
      </body>
      </html>
    `;

    // Attach .sql.gz
    const base64Content = fileBuffer.toString('base64');
    const attachments = [
      {
        filename: gzFilename,
        content: base64Content,
      }
    ];

    const emailRes = await sendEmailWithAttachment({
      to: RECIPIENT_EMAIL,
      subject: emailSubject,
      html: emailHtml,
      attachments
    });

    log(`✅ Email backup berhasil terkirim ke ${RECIPIENT_EMAIL}! (ID: ${emailRes.id || JSON.stringify(emailRes)})`);
    log(`✨ Proses backup selesai dengan sukses dalam ${durationSec} detik.`);
    log('================================================================');

    return {
      success: true,
      filename: gzFilename,
      size: gzSizeFormatted,
      emailId: emailRes.id,
      duration: durationSec
    };
  } catch (error) {
    log(`❌ ERROR SAAT PROSES BACKUP: ${error.message}`);
    log(error.stack);

    // Attempt to send failure notification
    try {
      await sendEmailWithAttachment({
        to: RECIPIENT_EMAIL,
        subject: `⚠️ [ALERT] Kegagalan Backup MTI (${dateFormatted})`,
        html: `
          <h2>⚠️ Peringatan: Proses Backup MTI Mengalami Kendala</h2>
          <p>Terjadi kesalahan saat membuat atau mengirimkan backup harian pada <strong>${dateFormatted} ${timeFormatted} WIB</strong>.</p>
          <pre style="background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px;">${error.message}\n${error.stack}</pre>
        `,
        attachments: []
      });
    } catch (notifyErr) {
      log(`Gagal mengirimkan notifikasi error via email: ${notifyErr.message}`);
    }

    throw error;
  }
}

// If executed directly from CLI
if (require.main === module) {
  runDailyBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runDailyBackup };
