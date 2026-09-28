'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Mail, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  Clock, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Send,
  Plus,
  UserCheck,
  FileCode2,
  Terminal,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface BackupItem {
  filename: string;
  size: number;
  size_formatted: string;
  created_at: string;
}

export function AdminBackupCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [lastBackupResult, setLastBackupResult] = useState<any>(null);
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
        if (!customEmail && json.data.recipient_email) {
          setCustomEmail(json.data.recipient_email);
        }
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

  const handleTriggerBackup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const target = (customEmail || backupData?.recipient_email || 'markaztikrarindonesia@gmail.com').trim();
    if (!target) {
      toast.error('Masukkan alamat email penerima backup');
      return;
    }

    try {
      setTriggering(true);
      toast.info(`Sedang membuat dump database dan mengirimkan ke ${target}...`);
      
      const res = await fetch('/api/admin/backup', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: target })
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success(`Alhamdulillah! Backup database berhasil dibuat dan terkirim ke ${target}`);
        setLastBackupResult({
          timestamp: new Date().toISOString(),
          recipient: target,
          output: json.data?.output || ''
        });
        fetchBackupStatus();
      } else {
        toast.error(json.error || 'Gagal menjalankan proses backup');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Terjadi kesalahan saat memproses backup');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Action Box */}
      <div className="border border-emerald-200 bg-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/10">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-black text-gray-900">Backup Otomatis Database MTI</h3>
                <span className="bg-emerald-100 text-emerald-900 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  Jadwal Cron Aktif (02:00 WIB)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Dump kompresi full PostgreSQL (<code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">.sql.gz</code>) berisi seluruh data santri, mu'allimah, pendaftaran, jurnal harian, tashih, infaq, dan penilaian.
              </p>
            </div>
          </div>
        </div>

        {/* Manual Email Input & Trigger Form */}
        <form onSubmit={handleTriggerBackup} className="bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-gray-50 p-5 sm:p-6 rounded-2xl border border-emerald-100/80 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-700" />
                <span>Kirimkan Backup Sekarang ke Email:</span>
              </span>
              <span className="text-[11px] font-normal text-gray-500">
                Bisa diisi email apa saja untuk pengujian/arsip
              </span>
            </Label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Input
                  type="email"
                  required
                  placeholder="markaztikrarindonesia@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="h-11 text-xs sm:text-sm rounded-xl border-gray-300 focus:border-emerald-600 bg-white font-medium pl-3.5 pr-10 shadow-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={triggering}
                className="h-11 px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 shrink-0 transition-all hover:scale-[1.01]"
              >
                {triggering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membuat & Mengirim Backup...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>🚀 Backup & Kirim Email Sekarang</span>
                  </>
                )}
              </Button>
            </div>

            {/* Quick Email Selection Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-gray-500 font-semibold text-[11px]">Pilih Cepat:</span>
              <button
                type="button"
                onClick={() => setCustomEmail('markaztikrarindonesia@gmail.com')}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                  customEmail === 'markaztikrarindonesia@gmail.com'
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-gray-700 border-gray-200'
                }`}
              >
                ✉️ markaztikrarindonesia@gmail.com (Utama)
              </button>

              {user?.email && user.email !== 'markaztikrarindonesia@gmail.com' && (
                <button
                  type="button"
                  onClick={() => setCustomEmail(user.email!)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                    customEmail === user.email
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-white hover:bg-emerald-50 text-gray-700 border-gray-200'
                  }`}
                >
                  👤 Email Saya ({user.email})
                </button>
              )}

              <button
                type="button"
                onClick={() => setCustomEmail('dewifebriani@gmail.com')}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                  customEmail === 'dewifebriani@gmail.com'
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-gray-700 border-gray-200'
                }`}
              >
                🔑 dewifebriani@gmail.com (Superadmin)
              </button>
            </div>
          </div>
        </form>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Jadwal Harian Otomatis</span>
            </div>
            <p className="font-black text-gray-900 text-sm sm:text-base pt-0.5">
              Pukul 02:00 WIB Dini Hari
            </p>
            <p className="text-[11px] text-gray-500">Cronjob aktif di server VPS Hostinger</p>
          </div>

          <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 space-y-1">
            <div className="flex items-center gap-2 text-teal-800 font-bold">
              <Mail className="w-4 h-4 text-teal-700" />
              <span>Penerima Default</span>
            </div>
            <p className="font-bold text-gray-900 text-xs sm:text-sm pt-0.5 truncate" title="markaztikrarindonesia@gmail.com">
              markaztikrarindonesia@gmail.com
            </p>
            <p className="text-[11px] text-gray-500">Dikirim via Resend verified domain MTI</p>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-1">
            <div className="flex items-center gap-2 text-blue-800 font-bold">
              <HardDrive className="w-4 h-4 text-blue-700" />
              <span>Arsip Redundansi Lokal</span>
            </div>
            <p className="font-black text-gray-900 text-sm sm:text-base pt-0.5">
              {backupData?.total_local_backups || 0} File Snapshot
            </p>
            <p className="text-[11px] text-gray-500">Tersimpan di VPS ~/backups/db (Retensi 30 hari)</p>
          </div>
        </div>

        {/* Local Files List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-emerald-700" />
              <span>Riwayat Berkas Backup di Server VPS</span>
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchBackupStatus}
              disabled={loading}
              className="h-8 text-xs rounded-xl font-semibold gap-1 text-gray-600 hover:text-emerald-950"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </Button>
          </div>

          {backupData && backupData.backups.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 max-h-56 overflow-y-auto text-xs">
              {backupData.backups.map((b, idx) => (
                <div key={b.filename} className="p-3 px-4 flex items-center justify-between hover:bg-emerald-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-mono font-bold text-gray-900 text-xs">{b.filename}</p>
                      <p className="text-[11px] text-gray-500">
                        Dibuat: {new Date(b.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: 'Asia/Jakarta'
                        })} WIB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                      {b.size_formatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-400">
              <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Belum ada daftar berkas backup lokal yang terdeteksi.</p>
            </div>
          )}
        </div>

        {/* Restore Guide */}
        <div className="bg-gray-900 text-gray-300 p-5 rounded-2xl space-y-2 border border-gray-800 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
            <Terminal className="w-4 h-4" />
            <span>Perintah Pemulihan Database (Restore Guide)</span>
          </div>
          <p className="text-gray-400 text-[11px]">
            Jika sewaktu-waktu database perlu dipulihkan dari file backup email, unduh file <code className="text-white">.sql.gz</code> lalu jalankan perintah berikut di server:
          </p>
          <div className="p-3 bg-black/50 rounded-xl font-mono text-emerald-300 text-[11px] overflow-x-auto border border-gray-800">
            gunzip -c mti_db_backup_XXXXX.sql.gz | psql -h 127.0.0.1 -U mti_user -d mti_db
          </div>
        </div>
      </div>
    </div>
  );
}
