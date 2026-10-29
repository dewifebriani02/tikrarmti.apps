import { requireAdmin, getAuthorizationContext } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

const DEFAULT_BACKUP_RECIPIENT = 'markaztikrarindonesia@gmail.com';

/**
 * Backups contain the whole database, so they may only be sent to known addresses:
 * the default/notification address, BACKUP_ALLOWED_RECIPIENTS (comma-separated),
 * or the requesting admin's own email.
 */
function getAllowedRecipients(ownEmail: string | undefined): Set<string> {
  const list = [
    DEFAULT_BACKUP_RECIPIENT,
    process.env.BACKUP_NOTIFICATION_EMAIL,
    ...(process.env.BACKUP_ALLOWED_RECIPIENTS || '').split(','),
    ownEmail,
  ];
  return new Set(list.map(e => (e || '').trim().toLowerCase()).filter(Boolean));
}

/**
 * GET /api/admin/backup
 * Get list of local database backups on the server
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const backupDbDir = path.join(process.env.HOME || '/home/markaztikrar', 'backups', 'db');
    const backupLogFile = path.join(process.env.HOME || '/home/markaztikrar', 'backups', 'backup.log');

    let files: Array<{ filename: string; size: number; size_formatted: string; created_at: string }> = [];
    if (fs.existsSync(backupDbDir)) {
      const fileNames = fs.readdirSync(backupDbDir).filter(f => f.endsWith('.sql.gz'));
      files = fileNames.map(f => {
        const fullPath = path.join(backupDbDir, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          size: stat.size,
          size_formatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
          created_at: stat.mtime.toISOString(),
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    let lastLog = '';
    if (fs.existsSync(backupLogFile)) {
      const logContent = fs.readFileSync(backupLogFile, 'utf8');
      const lines = logContent.trim().split('\n');
      lastLog = lines.slice(-20).join('\n');
    }

    return ApiResponses.success({
      recipient_email: process.env.BACKUP_NOTIFICATION_EMAIL || DEFAULT_BACKUP_RECIPIENT,
      total_local_backups: files.length,
      backups: files,
      recent_logs: lastLog,
    });
  } catch (error: any) {
    console.error('[Admin Backup GET Error]:', error);
    return ApiResponses.handleUnknown(error);
  }
}

/**
 * POST /api/admin/backup
 * Trigger manual database backup and email dispatch
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const context = await getAuthorizationContext();

    let targetEmail = process.env.BACKUP_NOTIFICATION_EMAIL || DEFAULT_BACKUP_RECIPIENT;
    try {
      const body = await request.json();
      if (body.recipient_email && typeof body.recipient_email === 'string' && body.recipient_email.trim()) {
        targetEmail = body.recipient_email.trim();
      }
    } catch (e) {}

    targetEmail = targetEmail.toLowerCase();
    if (!getAllowedRecipients(context?.email).has(targetEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email penerima backup tidak diizinkan. Gunakan email default, email Ukhti sendiri, atau tambahkan ke BACKUP_ALLOWED_RECIPIENTS.' },
        { status: 403 }
      );
    }

    console.info(`[Admin Backup] Manual backup requested by ${context?.email} -> ${targetEmail}`);

    const scriptPath = path.join(process.cwd(), 'scripts', 'daily-backup-email.js');

    // execFile passes the email as a plain argument — no shell, so no command injection
    const result = await new Promise((resolve, reject) => {
      execFile(process.execPath, [scriptPath, targetEmail], { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('[Backup Manual Trigger Error]:', error, stderr);
          reject(new Error('Gagal menjalankan proses backup'));
        } else {
          resolve(stdout);
        }
      });
    });

    return ApiResponses.success(
      { output: result, recipient_email: targetEmail },
      `Backup database berhasil dibuat dan dikirimkan ke ${targetEmail}`
    );
  } catch (error: any) {
    console.error('[Admin Backup POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menjalankan proses backup' },
      { status: 500 }
    );
  }
}
