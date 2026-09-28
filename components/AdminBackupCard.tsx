'use client';

import { useState, useEffect } from 'react';
import { Database, Mail, ShieldCheck, Download, RefreshCw, Clock, HardDrive, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BackupItem {
  filename: string;
  size: number;
  size_formatted: string;
  created_at: string;
}

export function AdminBackupCard() {
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [backupData, setBackupData] = useState<{
    recipient_email: string;
    total_local_backups: number;
    backups: BackupItem[];
    recent_logs: string;
  } | null>(null);

  const fetchBackupStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/backup');
      const json = await res.json();
      if (json.success) {
        setBackupData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupStatus();
  }, []);

  const handleTriggerBackup = async () => {
    if (!confirm('Jalankan proses backup database dan kirimkan file .sql.gz ke markaztikrarindonesia@gmail.com sekarang?')) {
      return;
    }

    try {
      setTriggering(true);
      toast.info('Sedang membuat database dump dan mengirim email...');
      
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const json = await res.json();
      
      if (json.success) {
        toast.success('Alhamdulillah! File backup database berhasil dikirim ke markaztikrarindonesia@gmail.com');
        fetchBackupStatus();
      } else {
        toast.error(json.error || 'Gagal menjalankan backup');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Terjadi kesalahan saat memproses backup');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>Backup Harian Otomatis ke Email</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Aktif (Cron Daily)
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Seluruh data PostgreSQL (semua tabel, users, jurnal, tashih, infaq) di-dump dan dikompres (.sql.gz) otomatis.
            </p>
          </div>
        </div>

        <Button
          onClick={handleTriggerBackup}
          disabled={triggering}
          className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs h-9 px-4 font-bold shadow-md gap-1.5 shrink-0"
        >
          {triggering ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses Backup...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Backup & Kirim Sekarang</span>
            </>
          )}
        </Button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tujuan Email</span>
          </div>
          <p className="font-bold text-gray-900 text-[13px] truncate">
            {backupData?.recipient_email || 'markaztikrarindonesia@gmail.com'}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Jadwal Eksekusi</span>
          </div>
          <p className="font-bold text-gray-900 text-[13px]">
            Setiap Hari Pukul 02:00 WIB
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Arsip Lokal Server</span>
          </div>
          <p className="font-bold text-gray-900 text-[13px]">
            {backupData?.total_local_backups || 0} File Tersimpan (30 Hari)
          </p>
        </div>
      </div>

      {/* Recent Backup Files */}
      {backupData && backupData.backups.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Arsip Backup Terbaru di VPS:</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-40 overflow-y-auto text-xs">
            {backupData.backups.slice(0, 5).map((b) => (
              <div key={b.filename} className="p-2.5 px-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-mono font-bold text-gray-900 text-[11px]">{b.filename}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(b.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Jakarta'
                      })} WIB
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 text-[11px]">
                  {b.size_formatted}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
