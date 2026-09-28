import { requireAdmin } from '@/lib/rbac';
import { ApiResponses } from '@/lib/api-responses';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

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
      recipient_email: process.env.BACKUP_NOTIFICATION_EMAIL || 'markaztikrarindonesia@gmail.com',
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

    let targetEmail = 'markaztikrarindonesia@gmail.com';
    try {
      const body = await request.json();
      if (body.recipient_email && typeof body.recipient_email === 'string' && body.recipient_email.trim()) {
        targetEmail = body.recipient_email.trim();
      }
    } catch (e) {}

    const scriptPath = path.join(process.cwd(), 'scripts', 'daily-backup-email.js');

    // Run script asynchronously with custom target email
    const result = await new Promise((resolve, reject) => {
      exec(`node "${scriptPath}" "${targetEmail}"`, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('[Backup Manual Trigger Error]:', error, stderr);
          reject(new Error(stderr || error.message));
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
